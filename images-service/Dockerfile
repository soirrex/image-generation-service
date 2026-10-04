FROM python:3.14.7

WORKDIR /images-service

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY ./ ./

CMD ["python", "-m", "src.main"]
