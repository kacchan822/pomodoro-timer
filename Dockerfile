# Dockerfile
FROM node:24-alpine

WORKDIR /app

# 依存インストールレイヤーをキャッシュするため package*.json を先にコピー
COPY package*.json ./
RUN npm ci

# ソースは docker-compose のボリュームマウントで上書きされるため
# COPY は省略可能だが、単独ビルド用に残しておく
COPY . .

EXPOSE 5173

# デフォルトは開発サーバー起動
CMD ["npm", "run", "dev"]
