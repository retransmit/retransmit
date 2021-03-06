/*
  Don't copy the content-type and content-length headers.
  That's going to differ based on the backend service.
*/
export function copyHeadersFromContext(headers: {
  [field: string]: string | string[] | undefined;
}) {
  const result: { [field: string]: string | string[] | undefined } = {};
  for (const field of Object.keys(headers || {})) {
    const lcaseField = field.toLowerCase();
    if (!["content-type", "content-length"].includes(lcaseField)) {
      result[lcaseField] = headers[field];
    }
  }
  return result;
}
