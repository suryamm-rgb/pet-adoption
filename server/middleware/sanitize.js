/** Strip Mongo operators ($...) and dotted keys from user input (NoSQL injection). */
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) delete value[key];
      else value[key] = clean(value[key]);
    }
  }
  return value;
}

export function sanitize(req, _res, next) {
  clean(req.body);
  clean(req.params);
  for (const key of Object.keys(req.query)) {
    if (key.startsWith("$")) delete req.query[key];
    else req.query[key] = clean(req.query[key]);
  }
  next();
}
