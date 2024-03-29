import { BaseButton, BaseButtonKind, ButtonProps } from '../BaseButton';

type ContainedButtonProps = ButtonProps & {
  kind?: Exclude<BaseButtonKind, 'text'>;
};

export const ContainedButton = ({ children, kind = 'primary', ...props }: ContainedButtonProps) => {
  return (
    <BaseButton kind={kind} {...props}>
      {children}
    </BaseButton>
  );
};
