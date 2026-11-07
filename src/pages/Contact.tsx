import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Instagram, Facebook, CheckCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import Spinner from '@/components/common/Spinner';

export default function Contact() {
  const { show } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      show('Please fill in all required fields.', 'error');
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSent(true);
    show('Message sent! We will get back to you soon.', 'success');
    setForm({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSent(false), 5000);
  };

  const contactInfo = [
    { icon: MapPin, label: 'Visit Us', value: 'Gulshan Avenue, Dhaka 1212, Bangladesh' },
    { icon: Phone, label: 'Call Us', value: '+880 1700 000000' },
    { icon: Mail, label: 'Email Us', value: 'hello@zovia.com.bd' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blush-100 via-ivory to-peach-100/40 py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="section-eyebrow mb-4">Get in Touch</p>
          <h1 className="font-display text-4xl sm:text-5xl text-plum-500 leading-tight">We'd Love to Hear From You</h1>
          <p className="mt-4 text-plum-400 text-lg">Questions about an order, sizing, or just want to say hello? We are here to help.</p>
        </div>
      </section>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact info */}
          <div className="lg:col-span-1 space-y-4">
            {contactInfo.map((info) => (
              <div key={info.label} className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-berry-50 text-berry-500 shrink-0">
                    <info.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-plum-300 font-semibold">{info.label}</p>
                    <p className="text-sm text-plum-500 mt-1">{info.value}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="card p-6">
              <p className="text-xs uppercase tracking-wider text-plum-300 font-semibold mb-4">Follow ZOVIA</p>
              <div className="flex gap-3">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full bg-berry-50 text-berry-500 hover:bg-berry-500 hover:text-white transition-all" aria-label="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full bg-berry-50 text-berry-500 hover:bg-berry-500 hover:text-white transition-all" aria-label="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>

            <div className="rounded-2xl bg-lavender-100/50 p-6">
              <p className="text-sm font-semibold text-plum-500 mb-1">Business Hours</p>
              <p className="text-xs text-plum-400">Saturday – Thursday</p>
              <p className="text-xs text-plum-400">10:00 AM – 8:00 PM</p>
              <p className="text-xs text-plum-300 mt-2">Friday: Closed</p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="h-6 w-6 text-berry-500" />
                <h2 className="font-display text-2xl text-plum-500">Send Us a Message</h2>
              </div>

              {sent && (
                <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-5 py-4 flex items-center gap-3 animate-slide-down">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <p className="text-sm text-green-700">Thank you! Your message has been sent. We will respond within 24 hours.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Your Name</label>
                    <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="label-field">Email Address</label>
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="you@example.com" />
                  </div>
                </div>

                <div>
                  <label className="label-field">Subject</label>
                  <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field" placeholder="What is this about?" />
                </div>

                <div>
                  <label className="label-field">Message</label>
                  <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input-field min-h-[140px] resize-y" placeholder="Tell us how we can help..." />
                </div>

                <button type="submit" disabled={sending} className="btn-primary shadow-soft hover:shadow-card">
                  {sending ? <Spinner size="sm" /> : <>Send Message <Send className="h-4 w-4" /></>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
