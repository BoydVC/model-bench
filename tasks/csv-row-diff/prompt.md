Finance exports two snapshots of the same table. Write `module.exports.diffRows = function diffRows(before, after, key)`.

`before` and `after` are arrays of flat objects. `key` is the id field.

Return `{ added, removed, changed }`.
- `added`: rows in after whose key is not in before.
- `removed`: rows in before whose key is not in after.
- `changed`: `{ key, fields }` for rows whose other values differ. `fields` maps a field name to `{ from, to }`. Omit the key field. Omit unchanged fields. Omit rows with no field changes.

The fixture shows the shape. The harness uses its own rows.
