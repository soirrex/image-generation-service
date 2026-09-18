import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import { processOutbox, type OutboxPool, type OutboxRow, type OutboxSender } from "./outbox.js";

describe("processOutbox", () => {
  let mockPool: jest.Mocked<OutboxPool>;
  let mockKafka: jest.Mocked<OutboxSender>;
  const LIMIT = 100;

  const value = (id: bigint): Record<string, unknown> => ({
    id: id.toString(),
    name: "test image",
    prompt: "a beautiful landscape",
    width: 512,
    height: 512,
  });

  const row = (id: bigint): OutboxRow => ({ id, value: value(id) });

  beforeEach(() => {
    mockPool = {
      query: jest.fn<OutboxPool["query"]>(),
    } as unknown as jest.Mocked<OutboxPool>;

    mockKafka = {
      send: jest.fn<OutboxSender["send"]>(),
    } as unknown as jest.Mocked<OutboxSender>;
  });

  it("returns { total: 0, sent: 0 } when outbox is empty", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await processOutbox(mockPool, mockKafka);

    expect(result).toEqual({ total: 0, sent: 0 });
    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, value FROM "ImageOutbox" ORDER BY id LIMIT $1',
      [LIMIT],
    );
    expect(mockKafka.send).not.toHaveBeenCalled();
  });

  it("sends and deletes a single row on success", async () => {
    const r = row(1n);
    mockPool.query.mockResolvedValueOnce({ rows: [r] });
    mockKafka.send.mockResolvedValueOnce(undefined);
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await processOutbox(mockPool, mockKafka);

    expect(result).toEqual({ total: 1, sent: 1 });
    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, value FROM "ImageOutbox" ORDER BY id LIMIT $1',
      [LIMIT],
    );
    expect(mockKafka.send).toHaveBeenCalledWith("1", value(1n));
    expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM "ImageOutbox" WHERE id = $1', [1n]);
  });

  it("sends Json value as-is without reshaping", async () => {
    const r = row(5n);
    mockPool.query.mockResolvedValueOnce({ rows: [r] });
    mockKafka.send.mockResolvedValueOnce(undefined);
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await processOutbox(mockPool, mockKafka);

    expect(result).toEqual({ total: 1, sent: 1 });
    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, value FROM "ImageOutbox" ORDER BY id LIMIT $1',
      [LIMIT],
    );
    expect(mockKafka.send).toHaveBeenCalledWith("5", {
      id: "5",
      name: "test image",
      prompt: "a beautiful landscape",
      width: 512,
      height: 512,
    });
    expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM "ImageOutbox" WHERE id = $1', [5n]);
  });

  it("increments attempts when kafka.send fails", async () => {
    const r = row(7n);
    mockPool.query.mockResolvedValueOnce({ rows: [r] });
    mockKafka.send.mockRejectedValueOnce(new Error("broker down"));
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await processOutbox(mockPool, mockKafka);

    expect(result).toEqual({ total: 1, sent: 0 });
    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, value FROM "ImageOutbox" ORDER BY id LIMIT $1',
      [LIMIT],
    );
    expect(mockKafka.send).toHaveBeenCalledWith("7", value(7n));
    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE "ImageOutbox" SET attempts = attempts + 1 WHERE id = $1',
      [7n],
    );
  });

  it("increments attempts when DELETE fails after successful send", async () => {
    const r = row(3n);
    mockPool.query.mockResolvedValueOnce({ rows: [r] });
    mockKafka.send.mockResolvedValueOnce(undefined);
    mockPool.query.mockRejectedValueOnce(new Error("db gone"));

    const result = await processOutbox(mockPool, mockKafka);

    expect(result).toEqual({ total: 1, sent: 0 });
    expect(mockPool.query).toHaveBeenCalledTimes(3);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, value FROM "ImageOutbox" ORDER BY id LIMIT $1',
      [LIMIT],
    );
    expect(mockKafka.send).toHaveBeenCalledWith("3", value(3n));
    expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM "ImageOutbox" WHERE id = $1', [3n]);
    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE "ImageOutbox" SET attempts = attempts + 1 WHERE id = $1',
      [3n],
    );
  });

  it("processes a batch with partial success", async () => {
    const rows = [row(1n), row(2n), row(3n)];
    mockPool.query.mockResolvedValueOnce({ rows });
    mockKafka.send.mockResolvedValueOnce(undefined);

    mockPool.query.mockResolvedValueOnce({ rows: [] });
    mockKafka.send.mockRejectedValueOnce(new Error("boom"));

    mockPool.query.mockResolvedValueOnce({ rows: [] });
    mockKafka.send.mockResolvedValueOnce(undefined);
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await processOutbox(mockPool, mockKafka);

    expect(result).toEqual({ total: 3, sent: 2 });
    expect(mockKafka.send).toHaveBeenCalledTimes(3);
    expect(mockKafka.send).toHaveBeenCalledWith("1", value(1n));
    expect(mockKafka.send).toHaveBeenCalledWith("2", value(2n));
    expect(mockKafka.send).toHaveBeenCalledWith("3", value(3n));

    expect(mockPool.query).toHaveBeenCalledTimes(4);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, value FROM "ImageOutbox" ORDER BY id LIMIT $1',
      [LIMIT],
    );
    expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM "ImageOutbox" WHERE id = $1', [1n]);
    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE "ImageOutbox" SET attempts = attempts + 1 WHERE id = $1',
      [2n],
    );
    expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM "ImageOutbox" WHERE id = $1', [3n]);
  });

  it("passes custom batchSize to SELECT", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await processOutbox(mockPool, mockKafka, 10);

    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, value FROM "ImageOutbox" ORDER BY id LIMIT $1',
      [10],
    );
  });

  it("propagates SELECT failure without sending", async () => {
    mockPool.query.mockRejectedValueOnce(new Error("select failed"));

    await expect(processOutbox(mockPool, mockKafka)).rejects.toThrow("select failed");
    expect(mockKafka.send).not.toHaveBeenCalled();
  });
});
