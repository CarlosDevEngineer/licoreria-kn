# Changes Made

## Backend
- **productos.controller.js**: `createProducto` auto-generates `codigo = PR-{producto_id}`; `updateProducto` no longer modifies `codigo`
- **productos.validator.js**: `codigo` made `.optional({ values: "falsy" })`
- **productos.routes.js**: removed `/verificar-stock` and `/getNextCode` routes
- **ventas.controller.js**: removed explicit `UPDATE stock_actual` from `createVenta` (triggers handle it now)
- **DB trigger fix**: dropped duplicate `trg_stock_venta`; rewrote `actualizar_stock_despues_venta()` to handle `tipo_venta` (caja multiplies by `unidades_por_caja`, unidad deducts as-is)

## Frontend (admin & vendedor)
- Fixed `fetchProductos`/`fetchProveedores` to check `res.ok` and `Array.isArray`
- Removed `verificarStock` button and function
- Table shows `PR-{producto_id}` instead of `p.codigo`
- `codigo` input replaced with read-only label
- Removed unused code (`SIN_ESPECIALES`, `fetchNextCode`, `proximoCodigo`)
- **agregarProducto**: max check = `stockOriginal - getUndEnCarrito(producto_id)` with `tipo_venta` awareness
- **actualizarCantidad**: maxQty = `restante / uds` (caja) or `restante` (unidad)
- **toggleTipoVenta**: maxUnd uses `restante` instead of `p.stock_actual`
- **Product cards**: show original stock (`stockOriginal`), not effective stock
- **Admin**: removed debug `console.log` from `registrarVenta`
