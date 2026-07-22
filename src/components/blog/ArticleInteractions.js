'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export default function ArticleInteractions({ articleId }) {
  const { data: session } = useSession();
  
  const [likes, setLikes] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLikes();
    fetchComments();
  }, [articleId]);

  const fetchLikes = async () => {
    try {
      const res = await fetch(`/api/blog/interactions/like?articleId=${articleId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLikes(data.count || 0);
      setLikedByMe(data.likedByMe || false);
    } catch (err) {
      console.error('Error fetching likes:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/blog/interactions/comments?articleId=${articleId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const toggleLike = async () => {
    if (!session) {
      window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.href);
      return;
    }
    
    setIsLiking(true);
    // Optimistic UI update
    setLikes(prev => likedByMe ? prev - 1 : prev + 1);
    setLikedByMe(!likedByMe);

    try {
      const res = await fetch('/api/blog/interactions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId })
      });
      const data = await res.json();
      if (!res.ok) {
        // Revert optimistic update
        setLikes(prev => likedByMe ? prev + 1 : prev - 1);
        setLikedByMe(likedByMe);
      }
    } catch (err) {
      setLikes(prev => likedByMe ? prev + 1 : prev - 1);
      setLikedByMe(likedByMe);
    } finally {
      setIsLiking(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!session) {
      window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.href);
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/blog/interactions/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, text: newComment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setComments([data.comment, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-[#EEEEEE]">
      {/* Like Button */}
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={toggleLike}
          disabled={isLiking}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all shadow-sm ${
            likedByMe 
              ? 'bg-primary text-on-primary hover:bg-on-primary-fixed-variant' 
              : 'bg-surface border border-[#EEEEEE] text-secondary hover:border-primary hover:text-primary'
          }`}
        >
          <span className={`material-symbols-outlined ${likedByMe ? 'fill-current' : ''}`}>favorite</span>
          {likes} {likes === 1 ? 'Like' : 'Likes'}
        </button>
      </div>

      {/* Comments Section */}
      <div className="bg-surface rounded-2xl border border-[#EEEEEE] p-6 shadow-sm">
        <h3 className="font-h3 text-h3 text-on-surface mb-6">Comments ({comments.length})</h3>

        {/* Comment Form */}
        <div className="flex gap-4 mb-8">
          <div className="w-10 h-10 rounded-full bg-surface-container flex-shrink-0 flex items-center justify-center overflow-hidden border border-[#EEEEEE]">
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[20px] text-secondary">person</span>
            )}
          </div>
          <form onSubmit={submitComment} className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={session ? "Leave a comment..." : "Sign in to leave a comment..."}
              className="w-full bg-surface border border-[#EEEEEE] rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface resize-none min-h-[100px]"
              onClick={() => {
                if (!session) window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.href);
              }}
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim() || !session}
                className="bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>

        {/* Comments List */}
        <div className="space-y-6">
          {comments.map(comment => (
            <div key={comment._id} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container flex-shrink-0 flex items-center justify-center overflow-hidden border border-[#EEEEEE]">
                {comment.userImage ? (
                  <img src={comment.userImage} alt={comment.userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[20px] text-secondary">person</span>
                )}
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-[14px] text-on-surface">{comment.userName}</span>
                  <span className="text-[12px] text-secondary">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[14px] text-on-surface leading-relaxed whitespace-pre-wrap">
                  {comment.text}
                </p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-secondary text-sm text-center py-4">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      </div>
    </div>
  );
}
