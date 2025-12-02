import React, { useState } from 'react';
import { Sparkles, Upload, ArrowRight, Loader2, X } from 'lucide-react';
import { editImageWithGemini } from '../services/geminiService';

interface ImageEditorProps {
  initialImage?: string;
  onSave: (newImage: string) => void;
  onClose: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ initialImage, onSave, onClose }) => {
  const [currentImage, setCurrentImage] = useState<string | null>(initialImage || null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!currentImage || !prompt) return;

    setIsLoading(true);
    setError(null);

    try {
      const editedImage = await editImageWithGemini(currentImage, prompt);
      setCurrentImage(editedImage);
      setPrompt(''); // Clear prompt after success
    } catch (err) {
      setError("Failed to edit image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#4c1d95] p-6 flex justify-between items-center">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <h2 className="text-xl font-bold">AI Image Studio</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            {/* Left: Preview */}
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 min-h-[300px] flex items-center justify-center relative overflow-hidden group shadow-sm">
                {currentImage ? (
                  <img 
                    src={currentImage} 
                    alt="Preview" 
                    className="w-full h-full object-contain max-h-[400px]"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No image selected</p>
                    <p className="text-slate-400 text-sm">Upload an image to start editing</p>
                  </div>
                )}
                
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                    <Loader2 className="w-10 h-10 text-[#4c1d95] animate-spin mb-2" />
                    <p className="text-[#4c1d95] font-medium">Gemini is reimagining your image...</p>
                  </div>
                )}
              </div>

              {!currentImage ? (
                 <label className="block w-full">
                 <input 
                   type="file" 
                   accept="image/*" 
                   onChange={handleFileChange}
                   className="hidden"
                 />
                 <div className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-lg text-center cursor-pointer hover:bg-slate-50 transition-colors font-medium shadow-sm flex items-center justify-center gap-2">
                   <Upload className="w-4 h-4" />
                   Upload Image
                 </div>
               </label>
              ) : (
                <div className="flex gap-2">
                   <label className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-full bg-white border border-slate-200 text-slate-700 py-2 rounded-lg text-center cursor-pointer hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm">
                      Change Image
                    </div>
                  </label>
                   {initialImage !== currentImage && (
                     <button 
                       onClick={() => setCurrentImage(initialImage || null)}
                       className="flex-1 bg-white border border-slate-200 text-slate-700 py-2 rounded-lg text-center cursor-pointer hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                     >
                       Reset
                     </button>
                   )}
                </div>
              )}
            </div>

            {/* Right: Controls */}
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Instructions</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Describe how you want to change the image using Gemini 2.5 Flash.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    "Add a retro filter", 
                    "Remove the person in the background", 
                    "Make it cyberpunk style", 
                    "Turn it into a sketch",
                    "Add a neon glow"
                  ].map(hint => (
                    <button 
                      key={hint}
                      onClick={() => setPrompt(hint)}
                      className="text-xs bg-indigo-50 text-[#4c1d95] px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-100"
                    >
                      {hint}
                    </button>
                  ))}
                </div>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., 'Change the background to a beach' or 'Add a red hat'"
                  className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none resize-none shadow-sm text-slate-700"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

              <div className="mt-auto flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!currentImage || !prompt || isLoading}
                  className="flex-1 bg-[#4c1d95] text-white py-3 rounded-xl font-semibold hover:bg-[#3b1675] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {isLoading ? 'Generating...' : 'Generate Edit'}
                </button>
                {currentImage && (
                   <button
                   onClick={() => onSave(currentImage)}
                   className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-md flex items-center gap-2"
                 >
                   Save
                   <ArrowRight className="w-4 h-4" />
                 </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;