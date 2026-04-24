import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    roots: ["<rootDir>"],
    testMatch: ["**/__tests__/**/*.test.ts"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                useESM: true,
                isolatedModules: true,
            },
        ],
    },
    extensionsToTreatAsEsm: [".ts"],
};

export default config;