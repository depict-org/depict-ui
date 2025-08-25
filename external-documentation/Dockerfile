# For local development and CI
FROM node:20-alpine as dev
RUN npm install -g mintlify
COPY . /app
WORKDIR /app
EXPOSE 3000
ENTRYPOINT ["mintlify", "dev"]

FROM dev as broken-links
RUN mintlify broken-links