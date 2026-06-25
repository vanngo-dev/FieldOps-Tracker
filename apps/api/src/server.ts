import { app } from "./app";

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`FieldOps API listening on port ${port}`);
});
