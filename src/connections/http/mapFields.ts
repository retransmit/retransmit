import { HttpRequest } from "../../types";
import { HttpRequestHandlerConfigBase } from "../../types/http";

export default function mapFields(
  request: HttpRequest,
  serviceConfig: HttpRequestHandlerConfigBase
) {
  const mappedFields = serviceConfig.fields;

  const requestWithMappedFields = mappedFields
    ? Object.keys(mappedFields).reduce(
        (acc, fieldName) => (
          (acc.body[mappedFields[fieldName]] = request.body[fieldName]), acc
        ),
        {
          ...request,
          headers: {
            ...request.headers,
          },
          body: {} as { [field: string]: any },
        }
      )
    : request;

  // If we have edited the fields, fix the content length
  // For now this supports only application/json
  if (mappedFields && requestWithMappedFields.headers) {
    for (const header of Object.keys(requestWithMappedFields.headers)) {
      if (header.toLowerCase() === "content-length") {
        requestWithMappedFields.headers[header] = `${
          JSON.stringify(requestWithMappedFields.body).length
        }`;
      }
    }
  }

  return requestWithMappedFields;
}