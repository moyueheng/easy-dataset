# 创建包含pnpm的基础镜像
FROM node:20-alpine AS pnpm-base
RUN npm install -g pnpm@9

# 构建阶段
FROM pnpm-base AS builder
WORKDIR /app

# 设置Prisma只下载linux-musl-openssl-3.0.x平台的二进制文件
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x

# 安装构建依赖
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    build-base \
    pixman-dev \
    pkgconfig

# 复制依赖文件和npm配置并安装(.npmrc中可配置国内源加速)
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install

# 复制源代码并构建
COPY . .
RUN pnpm build

# 构建完成后移除开发依赖，只保留生产依赖
RUN pnpm prune --prod

# 运行阶段
FROM pnpm-base AS runner
WORKDIR /app

# 只安装运行时依赖
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    pixman

# 复制package.json和.env文件
COPY package.json .env ./

# 从构建阶段复制精简后的node_modules（只包含生产依赖）
COPY --from=builder /app/node_modules ./node_modules

# 从构建阶段复制构建产物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/electron ./electron
COPY --from=builder /app/prisma ./prisma

# 设置生产环境
ENV NODE_ENV=production

EXPOSE 1717
CMD ["pnpm", "start"]
