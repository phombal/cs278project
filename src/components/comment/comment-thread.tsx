import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { VoteButtons } from "@/components/post/vote-buttons";
import { CommentForm } from "@/components/comment/comment-form";
import { CommentReplyToggle } from "@/components/comment/comment-reply-toggle";
import { timeAgo } from "@/lib/time";
import type { CommentWithAuthor } from "@/types/database";

export interface CommentNode extends CommentWithAuthor {
  children: CommentNode[];
  myVote: 1 | -1 | 0;
}

export function buildCommentTree(
  flat: (CommentWithAuthor & { myVote: 1 | -1 | 0 })[],
): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of flat) {
    byId.set(c.id, { ...c, children: [] });
  }
  for (const c of flat) {
    const node = byId.get(c.id)!;
    if (c.parent_comment_id) {
      const parent = byId.get(c.parent_comment_id);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }
  // Sort each level by score desc, then created_at asc.
  function sortLevel(nodes: CommentNode[]) {
    nodes.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.created_at.localeCompare(b.created_at);
    });
    nodes.forEach((n) => sortLevel(n.children));
  }
  sortLevel(roots);
  return roots;
}

export function CommentThread({
  nodes,
  postId,
  authed,
  postLocked,
}: {
  nodes: CommentNode[];
  postId: string;
  authed: boolean;
  postLocked: boolean;
}) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-[6px] border border-dashed border-stone bg-porcelain p-6 text-center text-[14px] text-slate">
        No comments yet — be the first to share your experience.
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {nodes.map((n) => (
        <li key={n.id}>
          <CommentItem
            node={n}
            postId={postId}
            authed={authed}
            postLocked={postLocked}
          />
        </li>
      ))}
    </ul>
  );
}

function CommentItem({
  node,
  postId,
  authed,
  postLocked,
}: {
  node: CommentNode;
  postId: string;
  authed: boolean;
  postLocked: boolean;
}) {
  return (
    <div>
      <div className="flex gap-3">
        <div className="flex flex-col items-center pt-1">
          <Avatar
            src={node.author_avatar_url}
            name={node.author_display_name}
            size={28}
          />
          {node.children.length > 0 && (
            <span
              className="mt-1 w-px flex-1 bg-stone"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <header className="flex items-center gap-1.5 text-[12px] text-slate">
            <Link
              href={`/u/${node.author_username}`}
              className="font-medium text-ink hover:text-violet"
            >
              @{node.author_username}
            </Link>
            <span className="text-ghost">·</span>
            <time dateTime={node.created_at}>
              {timeAgo(node.created_at)}
            </time>
            {node.is_deleted && (
              <span className="text-ghost italic">[removed]</span>
            )}
          </header>

          <div className="mt-1 prose-body text-[14px] whitespace-pre-wrap break-words">
            {node.is_deleted ? (
              <span className="text-ghost italic">[removed]</span>
            ) : (
              node.body
            )}
          </div>

          <footer className="mt-1.5 flex items-center gap-3 text-[12px]">
            <VoteButtons
              targetType="comment"
              targetId={node.id}
              initialScore={node.score}
              initialMyVote={node.myVote}
              layout="horizontal"
              size="sm"
              authed={authed}
            />
            {!postLocked && (
              <CommentReplyToggle
                postId={postId}
                parentCommentId={node.id}
                authed={authed}
              />
            )}
          </footer>
        </div>
      </div>

      {node.children.length > 0 && (
        <ul className="mt-3 ml-7 border-l border-stone pl-4 flex flex-col gap-4">
          {node.children.map((child) => (
            <li key={child.id}>
              <CommentItem
                node={child}
                postId={postId}
                authed={authed}
                postLocked={postLocked}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { CommentForm };
