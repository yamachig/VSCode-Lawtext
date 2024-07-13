
import path from "path";
import fs from "fs";
import type webpack from "webpack";
import WatchMessagePlugin from "./WatchMessagePlugin";

let rootDir = path.dirname(__dirname);
while (!fs.existsSync(path.join(rootDir, "package.json"))) {
    const newRootDir = path.dirname(rootDir);
    if (newRootDir === rootDir) break;
    rootDir = newRootDir;
}

const commonConfig = (_env: Record<string, string>, argv: Record<string, string>, projDir: string): webpack.Configuration => {
    const config: webpack.Configuration = {
        context: projDir,
        mode: argv.mode === "production" ? "production" : argv.mode === "development" ? "development" : "none",
        target: "node",
        entry: {
            bundle: path.resolve(projDir, "./src/main.ts")
        },
        output: {
            filename: "[name].js",
            path: path.resolve(projDir, "./out"),
            clean: argv.mode === "production",
        },
        resolve: {
            mainFields: ["module", "main"],
            extensions: [".ts", ".tsx", ".js", ".json"],
            alias: {
                //
            },
            fallback: {
                //
            },
        },
        module: {
            rules: [
                { test: /\.tsx?$/, loader: "ts-loader" },
                { test: /\.css$/, type: "asset/source" },
                { test: /\.html$/, type: "asset/source" },
                { test: /\.txt$/, type: "asset/source" },
            ],
        },

        plugins: [new WatchMessagePlugin()],

        watchOptions: {
            ignored: [
                "node_modules",
                "out",
                "out-browser",
            ],
        },

        devtool: "source-map",
        externals: {
            vscode: "commonjs vscode", // ignored because it doesn't exist
        },
    };
    return config;
};

// const mainPreviewerConfig = (env: Record<string, string>, argv: Record<string, string>): webpack.Configuration => {
//     const projDir = path.resolve(rootDir, "client");
//     const common = commonConfig(env, argv, projDir);
//     const config: webpack.Configuration = {
//         ...common,
//         name: "previewer",
//         target: "web",
//         entry: {
//             bundle: path.resolve(projDir, "./src/previewer/src/index.tsx")
//         },
//         output: {
//             ...common.output,
//             filename: "[name].js.txt",
//             path: path.resolve(projDir, "./src/previewer/out"),
//             libraryTarget: "commonjs",
//         },

//         plugins: [
//             ...(common.plugins || []),
//             new webpack.DefinePlugin({
//                 process: { env: {} }
//             })
//         ],
//     };
//     return config;
// };

const mainClientConfig = (env: Record<string, string>, argv: Record<string, string>): webpack.Configuration => {
    const projDir = path.resolve(rootDir, "client");
    const common = commonConfig(env, argv, projDir);
    const config: webpack.Configuration = {
        ...common,
        name: "main-client",
        dependencies: ["previewer"],
        output: {
            ...common.output,
            libraryTarget: "commonjs",
        }
    };
    return config;
};

const mainServerConfig = (env: Record<string, string>, argv: Record<string, string>): webpack.Configuration => {
    const projDir = path.resolve(rootDir, "server");
    const common = commonConfig(env, argv, projDir);
    const config: webpack.Configuration = {
        ...common,
        name: "main-server",
        output: {
            ...common.output,
            libraryTarget: "commonjs",
        }
    };
    return config;
};

export default [mainClientConfig, mainServerConfig];
