
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

const previewerConfig = (_env: Record<string, string>, argv: Record<string, string>): webpack.Configuration => {
    const projDir = path.resolve(rootDir, "client");
    const config: webpack.Configuration = {
        name: "previewer",
        context: projDir,
        mode: argv.mode === "production" ? "production" : argv.mode === "development" ? "development" : "none",
        target: "web",
        entry: {
            bundle: path.resolve(projDir, "./src/previewer/src/index.tsx")
        },
        output: {
            filename: "[name].js.txt",
            path: path.resolve(projDir, "./src/previewer/out"),
            libraryTarget: "commonjs",
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

        plugins: [
            new WatchMessagePlugin(),
            new webpack.DefinePlugin({
                process: { env: {} }
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

export default [previewerConfig];
