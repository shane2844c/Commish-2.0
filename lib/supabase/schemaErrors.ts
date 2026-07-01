export function isMissingSchemaError(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? "";
  return (
    error.code === "PGRST204" ||
    error.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("Could not find the") ||
    message.includes("does not exist")
  );
}
