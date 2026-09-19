import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-gutter py-12 @tablet:py-16">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          {/* The card title is the page heading: auth pages have no other h1. */}
          <h1 data-slot="card-title" className="font-heading text-2xl leading-snug font-medium">
            {title}
          </h1>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
