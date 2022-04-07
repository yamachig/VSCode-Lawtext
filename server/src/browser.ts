import { createConnection, BrowserMessageReader, BrowserMessageWriter } from "vscode-languageserver/browser";
import * as server from "./server";

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

server.main(connection);
