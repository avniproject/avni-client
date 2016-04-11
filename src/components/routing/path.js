import PathRegistry from './pathRegistry';

export default function Path(path, isDefault) {
  return (view) => {
    Object.assign(view, { component: () => view, path: () => path });

    PathRegistry.register(view);
    if (isDefault) PathRegistry.setDefault(view);
  };
}

