type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="page-title">{title}</h1>
      {description ? <p className="page-lede">{description}</p> : null}
    </header>
  );
}
