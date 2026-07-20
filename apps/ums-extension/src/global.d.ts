// Allow importing CSS files as side-effects (Plasmo handles bundling)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
