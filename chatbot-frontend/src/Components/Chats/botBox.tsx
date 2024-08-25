interface props {
  className?: string;
}

export const BotBox = (prop: props) => {
  return <div className={`${prop.className}`}></div>;
};
