import { buildServer } from "./server";

const app = buildServer({ logger: true });
const port = Number(process.env.PORT ?? 3333);

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
