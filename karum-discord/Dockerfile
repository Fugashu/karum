FROM python:3.11-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY src/ src/

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup --home /home/appuser appuser \
  && mkdir -p data /home/appuser/.cache/uv \
  && chown -R appuser:appgroup /app /home/appuser

USER appuser

CMD ["uv", "run", "python", "-m", "src.main"]
