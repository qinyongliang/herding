declare module "gitignore-parser" {
  export function compile(content: string): {
    denies: (path: string) => boolean;
    accepts: (path: string) => boolean;
  };
} 