import React, { useEffect, useState } from 'react';
import { fetchEducationNews } from '../services/geminiService';
import { NewsItem } from '../types';
import { Loader2, Newspaper, ExternalLink, Calendar } from 'lucide-react';

const NewsSection: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await fetchEducationNews();
        setNews(data);
      } catch (err) {
        setError('Failed to fetch the latest news.');
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  return (
    <div className="container mx-auto max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-teal-100 p-3 rounded-full">
            <Newspaper className="w-6 h-6 text-teal-600" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Education News Kenya</h2>
            <p className="text-gray-600 text-sm">Latest updates on TSC, CBE, and Education</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
          <p className="text-gray-500">Searching for the latest updates...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {news.map((item, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded font-medium">{item.source}</span>
                <span className="flex items-center gap-1 text-gray-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    {item.date}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{item.title}</h3>
              <p className="text-gray-600 text-sm mb-4 flex-grow">{item.summary}</p>
              
              <a 
                href={item.url !== '#' ? item.url : undefined} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 text-sm font-medium ${item.url !== '#' ? 'text-teal-600 hover:text-teal-800 hover:underline' : 'text-gray-400 cursor-default'}`}
              >
                Read More <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsSection;