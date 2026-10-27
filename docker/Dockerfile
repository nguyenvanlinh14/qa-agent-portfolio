# Test runner image: Playwright + browsers + Node, pinned to the same version as package.json
# so pixels (visual baselines) and browser builds are identical locally and in CI.
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app

# Install dependencies first so this layer is cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV CI=1
EXPOSE 4173

# Default: build the site and run the whole suite (the SUT is started by Playwright's webServer).
CMD ["npm", "test"]
