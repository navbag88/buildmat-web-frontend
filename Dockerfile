# ── Stage 1: Build Frontend ────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build -- --outDir dist

# ── Stage 2: Build Backend ─────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /app
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -q
COPY backend/src ./src
# Copy built frontend into Spring Boot static folder
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static
RUN mvn clean package -DskipTests -q

# ── Stage 3: Runtime ────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=backend-build /app/target/buildmat-web-1.0.0.jar app.jar

# Railway sets PORT env var
ENV PORT=8080
EXPOSE ${PORT}

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT} -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-railway} -XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -jar app.jar"]
