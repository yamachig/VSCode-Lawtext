import {
    createConnection,
    ProposedFeatures,
} from "vscode-languageserver/node";
import * as server from "./server";

const connection = createConnection(ProposedFeatures.all);

server.main(connection);
