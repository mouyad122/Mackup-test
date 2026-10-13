'use client';

import React, { useState, useTransition } from 'react';
import { submitReview } from '@/actions/reviews';

type ReviewData = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  isVerified: boolean;
  customer: {
    firstName: string;
    lastName: string | null;
  };
};

export function ProductReviews({ 
  productId, 
  reviews, 
  isAr 
}: { 
  productId: string; 
  reviews: ReviewData[]; 
  isAr: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!phone.trim() || !firstName.trim() || rating < 1 || rating > 5) {
      setError(isAr ? 'يرجى تعبئة جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    startTransition(async () => {
      try {
        await submitReview(productId, rating, comment, phone, firstName);
        setSuccess(true);
        setShowForm(false);
        setComment('');
        setPhone('');
        setFirstName('');
        setRating(5);
      } catch (err: any) {
        setError(err.message || (isAr ? 'حدث خطأ' : 'An error occurred'));
      }
    });
  };

  return (
    <div id="reviews">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div className="flex items-center gap-6 bg-white border border-[#E9DDCC] rounded-full px-6 py-3 shadow-sm">
          {reviews.length > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2B2B2B] text-3xl leading-none">{averageRating}</span>
                <div className="flex flex-col text-xs font-bold text-[#746A64]">
                  <span className="text-[#B7935F] text-sm tracking-widest">
                    {'★'.repeat(Math.round(Number(averageRating)))}{'☆'.repeat(5 - Math.round(Number(averageRating)))}
                  </span>
                  <span>{reviews.length} {isAr ? 'تقييم' : 'Reviews'}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-[#746A64] font-bold">{isAr ? 'كوني أول من يقيّم' : 'Be the first to review'}</p>
          )}
        </div>

        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-rawaq-primary w-full md:w-auto justify-center"
        >
          {isAr ? 'أضف تقييمك' : 'Write a Review'}
        </button>
      </div>

      {success && (
        <div className="bg-[#3F4B32]/5 border border-[#3F4B32]/20 text-[#3F4B32] font-bold p-4 rounded-xl mb-8 flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {isAr ? 'شكراً لك! تم إضافة تقييمك بنجاح.' : 'Thank you! Your review has been submitted successfully.'}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-[#E9DDCC] shadow-[0_4px_24px_rgba(139,30,45,.04)] p-8 rounded-2xl mb-12 space-y-6">
          <h3 className="font-bold font-heading text-2xl text-[#2B2B2B] mb-2">
            {isAr ? 'شاركنا رأيك' : 'Share Your Thoughts'}
          </h3>
          
          {error && <div className="text-[#3F4B32] bg-[#3F4B32]/5 p-3 rounded-lg text-sm border border-[#3F4B32]/20 font-bold">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'الاسم الأول' : 'First Name'} *</label>
              <input 
                type="text" 
                required 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)}
                className="w-full appearance-none border-b-2 border-[#E9DDCC] bg-transparent py-2 px-1 text-sm font-bold text-[#2B2B2B] transition-colors focus:border-[#B7935F] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'رقم الهاتف' : 'Phone Number'} *</label>
              <input 
                type="tel" 
                required 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                placeholder={isAr ? 'لن يتم عرضه للعامة' : 'Will not be shown publicly'}
                className="w-full appearance-none border-b-2 border-[#E9DDCC] bg-transparent py-2 px-1 text-sm font-bold text-[#2B2B2B] transition-colors focus:border-[#B7935F] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'التقييم' : 'Rating'} *</label>
            <div className="flex gap-2 text-3xl text-[#B7935F] cursor-pointer">
              {[1,2,3,4,5].map(star => (
                <span 
                  key={star} 
                  onClick={() => setRating(star)}
                  className={`transition-colors ${star <= rating ? 'text-[#B7935F]' : 'text-[#E9DDCC]'}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'التعليق' : 'Comment'}</label>
            <textarea 
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full appearance-none border-b-2 border-[#E9DDCC] bg-transparent py-2 px-1 text-sm font-bold text-[#2B2B2B] transition-colors focus:border-[#B7935F] focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="text-[#746A64] hover:text-[#3F4B32] font-bold text-sm transition-colors px-4 py-2"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button 
              type="submit" 
              disabled={isPending}
              className="btn-rawaq-primary disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال التقييم' : 'Submit Review')}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map(review => (
          <div key={review.id} className="bg-white border border-[#E9DDCC] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FBF8F2] border border-[#E9DDCC] rounded-full flex items-center justify-center font-bold text-[#2B2B2B] text-lg">
                  {review.customer.firstName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-[#2B2B2B]">{review.customer.firstName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex text-[#B7935F] text-sm">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </div>
                    {review.isVerified && (
                      <span className="text-xs text-[#3F4B32] flex items-center gap-1 font-bold">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        {isAr ? 'مشتري مؤكد' : 'Verified Buyer'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-[#A69A8C]">
                {new Date(review.createdAt).toLocaleDateString(isAr ? 'en-GB' : 'en-US')}
              </span>
            </div>
            {review.comment && (
              <p className="text-[#746A64] leading-relaxed rtl:pr-16 ltr:pl-16">
                {review.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
