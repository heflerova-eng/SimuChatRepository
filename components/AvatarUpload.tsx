import React, { useRef } from 'react';

interface AvatarUploadProps {
  label: string;
  currentUrl: string;
  onImageChange: (url: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ label, currentUrl, onImageChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      onImageChange(objectUrl);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div 
        className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer shadow-sm hover:border-blue-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <img 
          src={currentUrl} 
          alt={label} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <i className="fa-solid fa-camera text-white"></i>
        </div>
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
};

export default AvatarUpload;