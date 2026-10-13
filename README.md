# AI Image Generation Platform — `image-generation-service`

Asynchronous full-stack platform for generating images from a text prompt.

The user registers → sends `name + prompt` → gets a record with the `generation` status → a background Python worker generates the image → an S3 link appears in the card with the `completed` status.

> **The main focus of the project is `main-backend`** (Express + Prisma + Kafka + S3 + JWT + Swagger + InversifyJS + tests). The other services are supporting: `outbox-worker` (reliable delivery), `images-service` (Python AI generation with Torch), `frontend` (React), infrastructure (Postgres, Kafka, SeaweedFS S3).

## Contents

1. [Features](#1-features)
2. [Architecture](#2-architecture)
   - [2.1. Context diagram](#21-context-diagram)
   - [2.2. Docker network](#22-docker-network)
3. [Services](#3-services)
   - [3.1. main-backend — the main service](#31-main-backend--the-main-service-with-the-primary-focus)
   - [3.2. outbox-worker — delivery guarantee](#32-outbox-worker--delivery-guarantee)
   - [3.3. images-service — Python + Torch + AI generator](#33-images-service--python--torch--ai-generator)
   - [3.4. frontend — React + Vite + Tailwind](#34-frontend--react--vite--tailwind)
   - [3.5. Infrastructure: Postgres + Kafka + SeaweedFS S3](#35-infrastructure-postgres--kafka--seaweedfs-s3)
4. [AI generation: `USE_AI`, `default_image.png` and the Anything V5 model](#4-ai-generation-use_ai-default_imagepng-and-the-anything-v5-model)
   - [4.1. Two `images-service` modes](#41-two-images-service-modes)
   - [4.2. Model](#42-model)
5. [License of the `stablediffusionapi/anything-v5` model](#5-license-of-the-stablediffusionapianything-v5-model)
6. [REST API](#6-rest-api)
7. [Kafka topics and message formats](#7-kafka-topics-and-message-formats)
8. [Quick start](#8-quick-start)

## 1. Features

- Registration / login / logout with JWT in an `httpOnly` `userToken` cookie (7 days, `SameSite=Strict`, `bcrypt` + `Joi` validation).
- Image generation: `POST /api/images { name, prompt }` → `202 { message: "Image generation started" }`.
- List of your own images with pagination: `GET /api/images?page=&limit=` (defaults `page=1`, `limit=25`, max 100).
- Deletion: `DELETE /api/images/:id` (deletes both the object in S3 and the row in the DB).
- Image statuses: `generation` → `completed` / `failed`, fields `imageUrl`, `error`, `completedAt`.
- Swagger documentation at `GET /api-docs`.
- Two generation modes in `images-service`:
  - `USE_AI=false` (default) — instantly returns `default_image.png` with no GPU;
  - `USE_AI=true` — real diffusion on Torch + `diffusers` with the `stablediffusionapi/anything-v5` model (requires a CUDA GPU).
- Reliability via Transactional Outbox: `Image` + `ImageOutbox` records are written in a single transaction, with duplicate sending directly plus by a background worker.

## 2. Architecture

### 2.1. Context diagram

```
                                                           +----+
                    +------------------------------------> | S3 |
                    |                                      +--+-+
                    |               +-------+                 ^
                    |  +----------- | Queue | <---------+     |
                    |  |            +-------+           |     |
                    |  v                                |     |
 +----------+     +----+----+       +-------+     +-----+-----+----+
 | Frontend | --> | Backend | ----> | Queue | --> | Images-service |
 +----------+     +----+----+       +---+---+     +----------------+
                       |                ^
                       v                |
                +-------------+      +---------------+
                | Relational  | <--> | Outbox-worker |
                |     DB      |      +---------------+
                +-------------+
```

### 2.2. Docker network

All containers live in a single bridge network `images-network`:

| Container                 | Image / build                                                  | Exposed ports       |
| ------------------------- | ------------------------------------------------------------ | ------------------ |
| `postgres-images`         | `postgres:latest`                                            | `5432:5432`        |
| `seaweedfs-images`        | `chrislusf/seaweedfs:latest` (`server -s3 -filer`)           | `8333, 8888, 9333` |
| `seaweedfs-init-bucket`   | `chrislusf/seaweedfs` one-shot                               | —                  |
| `kafka-controller-images` | `apache/kafka:latest` (KRaft controller, node 1)             | —                  |
| `kafka-broker-images`     | `apache/kafka:latest` (broker, node 2, topic auto-creation) | `9092:9092`        |
| `main-backend`            | `build: ./backend` (Node 24)                                 | `3000:3000`        |
| `outbox-worker`           | `build: ./outbox-worker` (Node 24)                           | —                  |
| `images-service`          | `build: ./images-service` (Python 3.14)                      | —                  |

## 3. Services

### 3.1. `main-backend` — the main service, with the primary focus

> Location: `backend/`. Stack: **Node.js 24 + TypeScript (ESM, `strict`, `nodemext`) + Express 5 + Prisma 7 + InversifyJS DI + JWT + Joi + kafkajs + AWS SDK S3 + Swagger + pino + Jest/supertest.**

This is the **single REST API entry point** and the **only DB reader/writer**. All business logic lives here, which is why it took the most work: layered architecture, DI container, outbox transactions, Kafka producer/consumer with defensive parsing, S3 deletion, auth middleware, centralized errors, unit and e2e tests.

See details in [AGENTS.md](backend/AGENTS.md)

### 3.2. `outbox-worker` — delivery guarantee

> Location: `outbox-worker/`. Stack: **Node.js + TypeScript + `pg` + `kafkajs` + `node-cron` + `pino`.**

Implements the **Transactional Outbox** pattern: if `main-backend` fails to send a message to Kafka directly (broker unavailable, restart), the record stays in the `ImageOutbox` table, and the worker finishes it off.

- `src/index.ts` — every **30 seconds** (`*/30 * * * * *`) runs `processOutbox(pool, kafka)`.
- `src/outbox/outbox.ts` — `SELECT id, value FROM "ImageOutbox" ORDER BY id LIMIT 100`, for each row `kafka.send(id, value)` → `DELETE`, on error — `UPDATE attempts = attempts + 1` (the message remains until the next iteration).
- `src/kafka.ts` — thin `kafkajs` producer for the `KAFKA_TOPIC=image-generation` topic.
- Has no HTTP ports, depends on `postgres-images`, `kafka-*`, `main-backend` (so that the tables are already migrated).

### 3.3. `images-service` — Python + Torch + AI generator

> Location: `images-service/`. Stack: **Python 3.14 + `torch (cu126)` + `diffusers==0.40.0` + `transformers` + `kafka-python` + `boto3` + `Pillow` + `pydantic`.**

Stateless consumer: listens to `image-generation`, generates a PNG, puts it into S3, replies to `image-result`

### 3.4. `frontend` — React + Vite + Tailwind

> Location: `frontend/`. Stack: **React 19 + TypeScript + Vite + React Router v8 + Tailwind CSS v4 + `js-cookie`.**

### 3.5. Infrastructure: Postgres + Kafka + SeaweedFS S3

- **`postgres-images`** (`postgres:latest`, DB `app`, `postgres/postgres`, `:5432`) — the only persistent storage (`User`, `Image`, `ImageOutbox`). Migrations are applied by `main-backend`.
- **`kafka-controller-images` + `kafka-broker-images`** (`apache/kafka:latest`, KRaft, no ZooKeeper; `CLUSTER_ID=f8723412-...`). On startup the broker creates the `image-generation` and `image-result` topics (`kafka-topics.sh --create --if-not-exists`). In-network address is `kafka-broker-images:9092`.
- **`seaweedfs-images`** (`chrislusf/seaweedfs:latest`, `server -s3 -filer`, keys `admin/admin123`, `:8333` S3 API, `:8888` filer, `:9333` master) — S3-compatible object storage for PNGs. Healthcheck — `curl -f http://localhost:8888/`.
- **`create-bucket`** (one-shot `weed shell`: `s3.bucket.create -name images` + `s3.anonymous.set -bucket images -access Read`) — creates the public `images` bucket so that `imageUrl` opens without signing.

## 4. AI generation: `USE_AI`, `default_image.png` and the Anything V5 model

### 4.1. Two `images-service` modes

|                 | `USE_AI=false` (default in `docker-compose.yaml`)                        | `USE_AI=true`                                                                                             |
| --------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| What happens  | `Image.open("default_image.png")` — the same placeholder for any prompt | Loads the Stable Diffusion pipeline on CUDA and generates a unique 512×512 image               |
| Requirements      | CPU is enough, starts in seconds, lightweight image                               | **NVIDIA GPU with CUDA**, ~5–10 GB VRAM, weight download (~2–4 GB) on first start, startup takes several minutes |
| Response speed | Instant (+ upload to S3)                                                  | Tens of seconds per image (`num_inference_steps=25`)                                                     |

Switching is a single line in `docker-compose.yaml`:

```yaml
images-service:
  environment:
    USE_AI: false # ← default_image.png placeholder
    # USE_AI: true  # ← real Torch + Anything V5 (requires GPU)
```

### 4.2. Model

- **ID:** `stablediffusionapi/anything-v5` (anime styling, Stable Diffusion descendant).
- **Model card:** `https://huggingface.co/stablediffusionapi/anything-v5`.
- **Inference stack:** `torch==2.14.1+cu126`, `diffusers==0.40.0`, `transformers==5.18.0`, `float16` on `cuda`.
- **Default parameters:** `512×512`, `25 steps`, `guidance_scale=5`, long anime `negative_prompt` against hand/face artifacts.
- **Placeholder:** `images-service/default_image.png` — used with `USE_AI=false` and not related to the model in any way.

## 5. License of the `stablediffusionapi/anything-v5` model

The model is used only with `USE_AI=true` and is distributed under **CreativeML Open RAIL-M** (not MIT/Apache). Full text: `https://huggingface.co/spaces/CompVis/stable-diffusion-license`. The terms are mandatory: provide recipients with a copy of the license, preserve attribution notices, include the use restrictions (Attachment A) in your ToS, you are responsible for the generated Output yourself. The model is “AS IS”, without warranties. Prohibited: breaking the law, harm to minors, fakes/PII/harassment intended to cause harm, discrimination, medical and legal/law-enforcement decisions, fully automated legally significant decisions.

## 6. REST API

Base URL: `http://localhost:3000`. Swagger UI: `http://localhost:3000/api-docs`

## 7. Kafka topics and message formats

| Topic              | Producer → Consumer                                 | Key                       | Value (JSON)                                                                                                                            |
| ------------------ | --------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `image-generation` | `main-backend` / `outbox-worker` → `images-service` | `imageId` (BigInt string) | `{ "id": "1", "name": "My image", "prompt": "..." }`                                                                                    |
| `image-result`     | `images-service` → `main-backend`                   | `imageId`                 | success: `{ "id": "1", "image_url": "http://.../images/<uuid>.png", "message": "successfully" }`; error: `{ "id": "1", "error": "..." }` |

---

## 8. Quick start

**Requirements:** Docker + Docker Compose. For `USE_AI=true` additionally: NVIDIA GPU, CUDA driver, NVIDIA Container Toolkit.

```bash
# 1. Clone and enter the root (where docker-compose.yaml is)
git clone https://github.com/soirrex/image-generation-service.git && cd image-generation-service

# 2. No-GPU mode (default USE_AI=false, default_image.png is returned)
docker compose up --build

#   Frontend → http://localhost:5173
#   Backend  → http://localhost:3000
#   Swagger  → http://localhost:3000/api-docs
```

> Before enabling, read section 5 and comply with the Open RAIL-M terms
