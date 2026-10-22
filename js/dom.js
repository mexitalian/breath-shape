export function el(tag, className, props) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (props) Object.assign(node, props);
  return node;
}
