import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  // msw's package.json "exports" map needs the default condition, which
  // jsdom's testEnvironment excludes by default — without this, requiring
  // "msw/node" throws "Cannot find module".
  testEnvironmentOptions: {
    customExportConditions: [""],
  },
  setupFiles: ["<rootDir>/jest.polyfills.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/", "<rootDir>/reference/"],
};

const finalConfig = async () => {
  const nextConfig = await createJestConfig(config)();
  return {
    ...nextConfig,
    // MSW v2 and its ESM-only dependencies need transformation in jsdom.
    // Keep the allow-list narrow: transforming every installed package made
    // even focused component tests spend minutes compiling node_modules.
    transformIgnorePatterns: [
      "node_modules/(?!(msw|@mswjs|@open-draft|until-async|strict-event-emitter|headers-polyfill|is-utf8|outvariant|rettime|react-markdown|remark-gfm|remark-parse|remark-rehype|remark-stringify|unified|mdast-util-[^/]+|micromark[^/]*|hast-util-[^/]+|unist-util-[^/]+|vfile[^/]*|comma-separated-tokens|space-separated-tokens|property-information|style-to-js|style-to-object|inline-style-parser|estree-util-is-identifier-name|html-url-attributes|decode-named-character-reference|character-entities(?:-[^/]+)?|trim-lines|devlop|bail|trough)/)",
      "^.+\\.module\\.(css|sass|scss)$",
    ],
  };
};

export default finalConfig;
