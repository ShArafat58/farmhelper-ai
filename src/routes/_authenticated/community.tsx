import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MessagesSquare, Loader2, Sparkles, Send } from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { createPost, createReply, listPosts, listReplies } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "Community — FarmHelper" }] }),
  component: CommunityPage,
});

type Post = {
  id: string; title: string; body: string; ai_answer: string | null;
  user_id: string; created_at: string;
};

function CommunityPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const listFn = useServerFn(listPosts);
  const createFn = useServerFn(createPost);

  const q = useQuery({ queryKey: ["posts"], queryFn: () => listFn() });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const mut = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      setTitle(""); setBody("");
      toast.success("Question posted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 3) return toast.error("Add a title and question.");
    mut.mutate({
      data: {
        title: title.trim(),
        body: body.trim(),
        country: profile?.country ?? null,
        region: profile?.region ?? null,
        currency: profile?.currency ?? "USD",
        language: profile?.country === "BD" && profile?.preferred_language === "bn" ? "bn" : "en",
      },
    });
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <MessagesSquare className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Community</h1>
            <p className="text-sm text-muted-foreground">Ask farmers and get an instant AI answer.</p>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">Ask a question</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-2"><Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="What's wrong with my paddy?" />
              </div>
              <div className="grid gap-2"><Label>Details</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000} />
              </div>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Posting…</> : "Post question"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <h2 className="mt-10 text-lg font-semibold">Recent</h2>
        <div className="mt-3 space-y-4">
          {q.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
          {q.isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive">Could not load posts.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => q.refetch()}>Retry</Button>
            </div>
          )}
          {q.data && q.data.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No questions yet — be the first to ask.
            </div>
          )}
          {(q.data as Post[] | undefined)?.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </section>
    </SiteLayout>
  );
}

function PostCard({ post }: { post: Post }) {
  const qc = useQueryClient();
  const repliesFn = useServerFn(listReplies);
  const replyFn = useServerFn(createReply);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");

  const r = useQuery({
    queryKey: ["replies", post.id], enabled: open,
    queryFn: () => repliesFn({ data: { post_id: post.id } }),
  });

  const mut = useMutation({
    mutationFn: replyFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["replies", post.id] });
      setReply("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{post.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{post.body}</p>
        {post.ai_answer && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> AI answer
            </div>
            <p className="whitespace-pre-wrap text-sm">{post.ai_answer}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</span>
          <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide replies" : "View / reply"}
          </Button>
        </div>
        {open && (
          <div className="space-y-2 border-t pt-3">
            {r.isLoading && <Skeleton className="h-8" />}
            {(r.data ?? []).map((rep) => (
              <div key={rep.id} className="flex items-start gap-2">
                {rep.is_ai && <Badge variant="secondary" className="text-[10px]">AI</Badge>}
                <p className="text-sm">{rep.body}</p>
              </div>
            ))}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reply.trim()) return;
                mut.mutate({ data: { post_id: post.id, body: reply.trim() } });
              }}
            >
              <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply" maxLength={2000} />
              <Button type="submit" size="icon" disabled={mut.isPending}><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
