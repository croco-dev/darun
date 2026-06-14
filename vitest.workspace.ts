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
          include: [
            'apps/*/__tests__/**/*.test.ts',
            'libs/*/domain/src/**/*.test.ts',
            'libs/*/datasource/src/**/*.test.ts',
            'libs/*/feature/src/**/*.test.ts*',
            'libs/shared/**/src/**/*.test.ts*',
            'libs/*/shell/src/**/*.test.ts*',
            'libs/*/service/src/**/*.test.ts',
          ],
        },
      },
    ],
  },
});
