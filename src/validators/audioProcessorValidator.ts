import { checkSchema } from "express-validator";

export const audioProcessorValidator = checkSchema({
  fileName: { in: "query", isString: true, notEmpty: true },
});
