
import path from "path";
import fs from "fs";
import webpack from "webpack";
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
        target: "webworker",
        entry: {
            bundle: path.resolve(projDir, "./src/browser.ts")
        },
        output: {
            filename: "[name].js",
            path: path.resolve(projDir, "./out-browser"),
            clean: argv.mode === "production",
        },
        resolve: {
            mainFields: ["browser", "module", "main"],
            extensions: [".ts", ".tsx", ".js", ".json"],
            alias: {
                "node-fetch": false,
                "cli-progress": false,
                "fs": false,
            },
            fallback: {
                "path": require.resolve("path-browserify"),
                "buffer": require.resolve("buffer/"),
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

        plugins: [
            new webpack.ProvidePlugin({
                Buffer: ["buffer", "Buffer"],
            }),
            new WatchMessagePlugin(),
            new webpack.DefinePlugin({
                process: { env: {} }
            }),
            new webpack.optimize.LimitChunkCountPlugin({
                maxChunks: 1,
            }),
        ],

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

const browserClientConfig = (env: Record<string, string>, argv: Record<string, string>): webpack.Configuration => {
    const projDir = path.resolve(rootDir, "client");
    const common = commonConfig(env, argv, projDir);
    const config: webpack.Configuration = {
        ...common,
        name: "browser-client",
        dependencies: ["previewer"],
        output: {
            ...common.output,
            libraryTarget: "commonjs",
        }
    };
    return config;
};

const browserServerConfig = (env: Record<string, string>, argv: Record<string, string>): webpack.Configuration => {
    const projDir = path.resolve(rootDir, "server");
    const common = commonConfig(env, argv, projDir);
    const config: webpack.Configuration = {
        ...common,
        name: "browser-server",
        output: {
            ...common.output,
            libraryTarget: "var",
            library: "serverExportVar",
        }
    };
    return config;
};

export default [browserClientConfig, browserServerConfig];
