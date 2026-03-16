type WorkspaceProject = {
  extends: string;
  test: {
    name: string;
    root?: string;
    include: string[];
  };
};

type WorkspaceConfig = {
  test: {
    projects: WorkspaceProject[];
  };
};

const defineWorkspace = (config: WorkspaceConfig) => config;

export default defineWorkspace({
  test: {
    projects: [
      {
        extends: './vitest.config.ts',
        test: {
          name: 'root',
          include: ['apps/*/__tests__/**/*.test.ts', 'libs/shared/**/src/**/*.test.ts'],
        },
      },
      {
        extends: './vitest.config.ts',
        test: {
          name: 'products-domain',
          root: './libs/products/domain',
          include: ['src/__tests__/**/*.test.ts'],
        },
      },
      {
        extends: './vitest.config.ts',
        test: {
          name: 'companies-domain',
          root: './libs/companies/domain',
          include: ['src/__tests__/**/*.test.ts'],
        },
      },
    ],
  },
});
