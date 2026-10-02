/**
 * @hey-research-lab/embed — the client side of HEY Research Lab's embed contract.
 *
 * Importing this module in a browser registers `<hey-project>` (unless something already did,
 * such as production's hosted script). On a server it registers nothing. Every widget frame it
 * draws is served by https://heyresearch.xyz; this package renders no research itself.
 */
import { defineHeyProject } from './element';

export { CAIP2, CHAIN_ID, CHAIN_NAME, UnsupportedChainError } from './chain';
export {
  DEFAULT_EMBED_THEME,
  DEFAULT_EMBED_VARIANT,
  EMBED_CONFIGURATOR_URL,
  EMBED_DEFAULT_TITLE,
  EMBED_ELEMENT_ATTRIBUTES,
  EMBED_ELEMENT_NAME,
  EMBED_FRAME_PATH_PREFIX,
  EMBED_HEIGHT_MESSAGE,
  EMBED_HEIGHT_RANGE,
  EMBED_INITIAL_HEIGHT,
  EMBED_PACKAGE_ATTRIBUTES,
  EMBED_SANDBOX,
  EMBED_SCRIPT_PATH,
  EMBED_SCRIPT_URL,
  EMBED_THEMES,
  EMBED_TITLE_MAX_LENGTH,
  EMBED_UTM_SOURCE,
  EMBED_VARIANTS,
  EMBED_VARIANT_LABELS,
  HEY_ORIGIN,
  clampEmbedHeight,
  isEmbedTheme,
  isEmbedVariant,
  parseEmbedTheme,
  parseEmbedVariant,
  type EmbedAttributeName,
  type EmbedTheme,
  type EmbedVariant,
} from './contract';
export {
  EMBED_CONTRACT_RE,
  EMBED_SLUG_RE,
  HeyEmbedError,
  embedRefSegment,
  parseEmbedRef,
  readEmbedRef,
  toEmbedRef,
  type EmbedErrorCode,
  type EmbedRef,
  type EmbedRefResult,
} from './ref';
export {
  parseEmbedHeight,
  readEmbedAttributes,
  validateEmbedAttributes,
  type EmbedAttributeIssue,
  type EmbedAttributeReading,
  type EmbedAttributes,
  type EmbedWarningCode,
} from './validate';
export { embedFrameUrl, projectPageUrl, type EmbedFrameOptions } from './url';
export {
  htmlSnippet,
  iframeSnippet,
  reactSnippet,
  scriptTag,
  type HtmlSnippetOptions,
  type SnippetTarget,
} from './snippets';
export {
  createHeyProjectElement,
  defineHeyProject,
  type HeyProjectElement,
  type HeyProjectEnvironment,
} from './element';

defineHeyProject();
