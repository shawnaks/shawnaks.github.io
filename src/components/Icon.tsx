export type IconProps = {
  name: string;
};

export function Icon({ name }: IconProps) {
  return (
    <svg className="icon" aria-hidden="true" focusable="false">
      <use href={'#i-' + name} />
    </svg>
  );
}
