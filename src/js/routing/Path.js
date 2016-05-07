import PathRegistry from './PathRegistry';

export default function Path(path) {
  return (view) => {
    Object.assign(view, { component: () => view, path: () => path });

    PathRegistry.register(view);
  };
}

export function PathRoot(view) {
  PathRegistry.setDefault(view);
}