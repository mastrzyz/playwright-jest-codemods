import jscodeshift from 'jscodeshift'

import detectLineTerminator from './line-terminator'
import detectQuoteStyle from './quote-style'

/**
 * Exposes the finale shared by all transformers.
 * @return the ast.toSource that should be returned to jscodeshift.
 */
export default function finale(fileInfo, j: jscodeshift.JSCodeshift, ast: any) {
  // As Recast is not preserving original quoting, we try to detect it,
  // and default to something sane.
  const quote = detectQuoteStyle(j, ast) || 'single'
  const lineTerminator = detectLineTerminator(fileInfo.source)
  return ast.toSource({ quote, lineTerminator })
}
