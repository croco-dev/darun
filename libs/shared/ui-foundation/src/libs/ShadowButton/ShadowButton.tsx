import { BaseButton, BaseButtonKind, ButtonProps } from '../BaseButton';

type ShadowButtonProps = ButtonProps & {
  kind?: BaseButtonKind;
};

export const ShadowButton = ({ children, kind = 'text', ...props }: ShadowButtonProps) => {
  return (
    <BaseButton
      kind={kind}
      borderColor={'rgba(0, 0, 0, 0.1)'}
      boxShadow="0px 2px 8px 0px rgba(0, 0, 0, 0.08)"
      {...props}
    >
      {children}
    </BaseButton>
  );
};
