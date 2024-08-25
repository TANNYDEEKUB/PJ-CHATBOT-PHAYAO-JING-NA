interface props {
  className?: string;
}

export const UserBox = (prop: props) => {
  return <div className={`${prop.className}`}></div>;
};
