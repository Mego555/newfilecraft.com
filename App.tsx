
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { FileAnalysis } from './components/FileAnalysis';
import { ImageAnalysis } from './components/ImageAnalysis';
import { ConversionEngine } from './components/ConversionEngine';
import { Proofreader } from './components/Proofreader';
import { CodeSnippet } from './components/CodeSnippet';
import { UserProfile } from './components/UserProfile';
import { LoginScreen } from './components/LoginScreen';
import { SubscriptionModal } from './components/SubscriptionModal';
import { analyzeFile, generateScripts, convertFileContent, simulateVirusScan } from './services/geminiService';
import { AnalysisResult, ConversionSuggestion, User, ConversionHistoryEntry, ScanResult } from './types';

function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Record<string, string> | null>(null);

  // User and Profile State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [conversionHistory, setConversionHistory] = useState<ConversionHistoryEntry[]>([]);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Load user state and history from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem('filecraft_user');
    const storedHistory = localStorage.getItem('filecraft_history');
    if (storedUser) {
      const user: User = JSON.parse(storedUser);
      // Check if trial is expired on load
      if (user.subscription === 'Free Trial' && user.trialEndsAt && Date.now() > user.trialEndsAt) {
        user.subscription = 'Expired';
      }
      setCurrentUser(user);
    }
    if (storedHistory) {
      setConversionHistory(JSON.parse(storedHistory));
    }
  }, []);

  // Persist user state and history to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('filecraft_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('filecraft_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('filecraft_history', JSON.stringify(conversionHistory));
  }, [conversionHistory]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;
    
    setSelectedFile(file);
    setAnalysisResult(null);
    setScanResult(null);
    setError(null);
    setScripts(null);
    setIsLoading(true);

    try {
      // Step 1: Security Scan
      setLoadingMessage('Scanning for threats...');
      const scan = await simulateVirusScan(file);
      setScanResult(scan);
      
      // Step 2: AI Analysis
      setLoadingMessage(`Analyzing ${file.name}...`);
      const result = await analyzeFile(file, scan.status);
      setAnalysisResult(result);

    } catch (err) {
      setError('Failed to process file. The AI model may be unavailable or the scan failed. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);
  
  const handleRenameFile = (newName: string) => {
    if (!selectedFile) return;

    // File objects are immutable, so we create a new one.
    const newFile = new File([selectedFile], newName, {
        type: selectedFile.type,
        lastModified: selectedFile.lastModified,
    });
    setSelectedFile(newFile);
  };

  const handleConversionSelect = useCallback(async (targetFormat: ConversionSuggestion) => {
    if (!analysisResult || !selectedFile) return;
    
    setScripts(null);
    setError(null);
    setIsLoading(true);

    try {
      const sourceFormat = analysisResult.type === 'file' ? analysisResult.fileType : analysisResult.format;
      const generatedScripts = await generateScripts(sourceFormat, targetFormat.format);
      setScripts(generatedScripts);

      const conversionResult = await convertFileContent(selectedFile, targetFormat.format);

      const blob = conversionResult.isBinary
        ? base64ToBlob(conversionResult.content, conversionResult.mimeType)
        : new Blob([conversionResult.content], { type: conversionResult.mimeType });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const oldName = selectedFile.name;
      const baseName = oldName.includes('.') ? oldName.substring(0, oldName.lastIndexOf('.')) : oldName;
      const newFileName = `${baseName}${targetFormat.extension}`;
      
      a.download = newFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Add to conversion history
      const newHistoryEntry: ConversionHistoryEntry = {
        id: crypto.randomUUID(),
        originalName: selectedFile.name,
        fromFormat: analysisResult.type === 'file' ? analysisResult.extension : `.${analysisResult.format.toLowerCase()}`,
        toFormat: targetFormat.extension,
        timestamp: new Date().toISOString(),
      };
      setConversionHistory(prev => [newHistoryEntry, ...prev]);

    } catch(err) {
      const errorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred.';
      setError(`Failed to perform conversion. ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [analysisResult, selectedFile]);

  const handleReset = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    setScripts(null);
    setScanResult(null);
    setIsLoading(false);
  };
  
  const handleLogin = () => {
    // Check if user exists, otherwise create a new trial user
    const storedUser = localStorage.getItem('filecraft_user');
    if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
    } else {
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 3);
        const newUser: User = {
            name: 'Alex Rider',
            subscription: 'Free Trial',
            trialEndsAt: trialEnds.getTime(),
            settings: {
                darkMode: true,
                notifications: false
            }
        };
        setCurrentUser(newUser);
    }
  };
  
  const handleLogout = () => {
    // Keep user data in localStorage, just log them out of the session
    setCurrentUser(null);
    setIsProfileOpen(false);
  };

  const handleSettingsChange = (newSettings: User['settings']) => {
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, settings: newSettings } : null);
    }
  };

  const handleActivateSubscription = (code: string) => {
    if (code === 'PRO-YEARLY-2024' && currentUser) {
        setCurrentUser({ ...currentUser, subscription: 'Pro', trialEndsAt: undefined });
        setIsSubscriptionModalOpen(false);
        return true;
    }
    return false;
  };
  
  const isTextFile = selectedFile?.type.startsWith('text/') || selectedFile?.name.endsWith('.md') || selectedFile?.name.endsWith('.txt');

  const isSubscriptionExpired = currentUser?.subscription === 'Expired';
  
  useEffect(() => {
    if (isSubscriptionExpired) {
        setIsSubscriptionModalOpen(true);
    }
  }, [isSubscriptionExpired]);


  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <>
      <div className={`min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 ${isSubscriptionExpired ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="w-full max-w-5xl mx-auto">
          <Header 
            onReset={handleReset} 
            hasContent={!!selectedFile}
            user={currentUser}
            onProfileClick={() => setIsProfileOpen(true)}
          />

          <main className="mt-8">
            {!selectedFile ? (
              <FileUpload onFileSelect={handleFileSelect} />
            ) : (
              <div className="space-y-8">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center p-12 bg-gray-800/50 rounded-lg border border-dashed border-gray-600">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                    <p className="mt-4 text-lg text-gray-400">{loadingMessage || 'Processing...'}</p>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}

                {analysisResult && scanResult && (
                  <>
                    {analysisResult.type === 'file' && <FileAnalysis file={selectedFile} result={analysisResult} scanResult={scanResult} onRename={handleRenameFile} />}
                    {analysisResult.type === 'image' && <ImageAnalysis file={selectedFile} result={analysisResult} scanResult={scanResult} onRename={handleRenameFile} />}

                    <ConversionEngine 
                      suggestions={analysisResult.conversionSuggestions} 
                      onConvert={handleConversionSelect} 
                    />
                    {isLoading && !scripts && <p className="text-center text-gray-400">Generating scripts and converting file...</p>}
                    {scripts && <CodeSnippet scripts={scripts} />}
                    {isTextFile && <Proofreader file={selectedFile} />}
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      <UserProfile 
       isOpen={isProfileOpen}
       onClose={() => setIsProfileOpen(false)}
       user={currentUser}
       history={conversionHistory}
       onLogout={handleLogout}
       onSettingsChange={handleSettingsChange}
       onUpgradeClick={() => setIsSubscriptionModalOpen(true)}
      />
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onActivate={handleActivateSubscription}
        onClose={() => {
            // Only allow closing if not expired
            if (!isSubscriptionExpired) {
                setIsSubscriptionModalOpen(false);
            }
        }}
      />
    </>
  );
}