'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import ResolutionDatePicker from '@/components/create/ResolutionDatePicker';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import EarningDetails from '@/components/create/EarningDetails';


type FormErrors = {
    marketQuestion?: string;
    resolutionDate?: string;
    betAmount?: string;
};

const CreateMarketPage = () => {
    const [marketQuestion, setMarketQuestion] = useState('');
    const [resolutionDate, setResolutionDate] = useState<Date | undefined>(new Date());
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [betAmount, setBetAmount] = useState('');
    const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setResolutionDate(tomorrow);
    }, []);

    const validate = () => {
        const newErrors: FormErrors = {};
        if (!marketQuestion.trim()) {
            newErrors.marketQuestion = 'Market question is required.';
        }
        if (!resolutionDate) {
            newErrors.resolutionDate = 'Resolution date is required.';
        }
        const amount = parseFloat(betAmount);
        if (!betAmount.trim()) {
            newErrors.betAmount = 'Bet amount is required.';
        } else if (isNaN(amount) || amount < 1 || amount > 1000) {
            newErrors.betAmount = 'Bet amount must be between $1 and $1000.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('marketQuestion', marketQuestion);
        formData.append('resolutionDate', resolutionDate!.toISOString());
        if (image) {
            formData.append('image', image);
        }
        formData.append('betAmount', betAmount);
        formData.append('betSide', betSide);

        console.log('Submitting market:', {
            marketQuestion,
            resolutionDate: resolutionDate!.toISOString(),
            image: image?.name,
            betAmount,
            betSide,
        });

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        // TODO: Replace with actual market ID from API response
        const newMarketId = 'new-market-id'; 

        toast({
            title: "Market created successfully!",
            description: "Your new prediction market is live.",
        });

        router.push(`/match/${newMarketId}`);
        
        setIsSubmitting(false);
    };

    const handleBlur = (field: keyof FormErrors) => {
        validate();
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert('File size should be less than 5MB');
                return;
            }
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const isFormValid = marketQuestion.trim() !== '' && resolutionDate && betAmount.trim() !== '' && parseFloat(betAmount) >= 1 && parseFloat(betAmount) <= 1000;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold mb-2">Create a New Prediction Market</h1>
                <p className="text-lg text-gray-500">Powered by Grok for automatic resolution.</p>
            </div>
            
            {/* Earning Details Section */}
            <div className="max-w-3xl mx-auto mb-10">
                <EarningDetails />
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <Card>
                        <CardHeader>
                            <CardTitle>Market Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="market-question">Market Question</Label>
                                <Input
                                    id="market-question"
                                    placeholder='e.g., "Will ETH price reach $5,000 by end of year?"'
                                    value={marketQuestion}
                                    onChange={(e) => setMarketQuestion(e.target.value)}
                                    onBlur={() => handleBlur('marketQuestion')}
                                    maxLength={100}
                                    autoFocus
                                />
                                {errors.marketQuestion && <p className="text-sm text-red-500">{errors.marketQuestion}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="resolution-date">Resolution Date</Label>
                                <ResolutionDatePicker
                                    selected={resolutionDate}
                                    onSelect={setResolutionDate}
                                    disabled={(date) =>
                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                    error={errors.resolutionDate}
                                />
                                <p className="text-xs text-gray-500">
                                    Grok will evaluate based on real-time data at this time.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="market-image">Market Image (Optional)</Label>
                                <div className="flex items-center gap-4">
                                    <label htmlFor="market-image-upload" className="cursor-pointer flex-grow">
                                        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-primary">
                                            <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                            <p className="mt-2 text-sm text-gray-500">
                                                {image ? image.name : 'Click to upload (JPG, PNG, max 5MB)'}
                                            </p>
                                        </div>
                                        <input
                                            id="market-image-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/jpeg,image/png"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="initial-bet">Initial Bet</Label>
                                <Input
                                    id="initial-bet"
                                    type="number"
                                    placeholder="e.g., 100"
                                    value={betAmount}
                                    onChange={(e) => setBetAmount(e.target.value)}
                                    onBlur={() => handleBlur('betAmount')}
                                    min="1"
                                    max="1000"
                                />
                                {errors.betAmount && <p className="text-sm text-red-500">{errors.betAmount}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Choose Side</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setBetSide('yes')}
                                        className={`relative p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                                            betSide === 'yes' ? 'border-primary shadow-lg' : 'border-border'
                                        }`}
                                    >
                                        <p className="text-2xl font-bold">YES</p>
                                        <p className="text-xl font-semibold text-green-500">+</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBetSide('no')}
                                        className={`relative p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                                            betSide === 'no' ? 'border-primary shadow-lg' : 'border-border'
                                        }`}
                                    >
                                        <p className="text-2xl font-bold">NO</p>
                                        <p className="text-xl font-semibold text-red-500">-</p>
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button type="button" variant="outline">Cancel</Button>
                            <Button type="submit" disabled={!isFormValid || isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Launching...
                                    </>
                                ) : (
                                    'Launch Market'
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Market Preview */}
                    <div className="sticky top-24">
                        <Card className="w-full max-w-md mx-auto shadow-xl rounded-lg text-center overflow-hidden">
                            <CardHeader className="bg-muted/30 p-3 md:p-4 space-y-1">
                                <CardTitle className="text-left text-base md:text-lg font-semibold">
                                    Market Preview
                                </CardTitle>
                                <p className="text-xs text-muted-foreground text-left">
                                    How your market will appear to bettors
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 md:p-6">
                                {imagePreview && (
                                    <div className="w-full h-32 bg-gray-200 rounded-md overflow-hidden mb-4">
                                        <img src={imagePreview} alt="Market preview" className="object-cover w-full h-full" />
                                    </div>
                                )}
                                
                                <p className="italic text-lg md:text-xl font-semibold text-foreground leading-tight">
                                    "{marketQuestion || 'Your market question will appear here'}"
                                </p>

                                <div className="my-3 space-y-2 py-2 border-y border-border/30">
                                    <div className="text-center">
                                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Preview Odds</p>
                                        <div className="flex justify-around items-start">
                                            <div className="text-center relative px-1">
                                                <span className="text-2xl md:text-3xl font-bold text-green-500">--</span>
                                                <p className="text-xs text-muted-foreground mt-0.5">Betting YES</p>
                                            </div>
                                            <div className="text-center relative px-1">
                                                <span className="text-2xl md:text-3xl font-bold text-red-500">--</span>
                                                <p className="text-xs text-muted-foreground mt-0.5">Betting NO</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center p-1.5 rounded-md bg-muted/30">
                                        <p className="text-xs text-muted-foreground">Initial Odds:</p>
                                        <p className="text-base md:text-lg font-semibold">
                                            <span className={cn("font-bold", betSide === 'yes' ? 'text-green-500' : 'text-gray-500')}>
                                                YES {betSide === 'yes' ? '(Your bet)' : '50%'}
                                            </span>
                                            {' / '}
                                            <span className={cn("font-bold", betSide === 'no' ? 'text-red-500' : 'text-gray-500')}>
                                                NO {betSide === 'no' ? '(Your bet)' : '50%'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-4">
                                    <div className="flex-1 h-12 px-3 bg-gray-300 text-gray-600 font-bold rounded-lg flex items-center justify-center space-x-1.5 text-base opacity-75">
                                        <span>Betting Options</span>
                                    </div>
                                </div>
                                
                                <div className="text-xs text-muted-foreground mt-3 space-y-1">
                                    <p className="text-sm text-gray-500">
                                        Resolves: {resolutionDate ? resolutionDate.toLocaleDateString() : 'Select date'}
                                    </p>
                                    <p>🛡️ Secure betting powered by smart contracts</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex items-center justify-between p-3 bg-muted/20 border-t text-xs text-muted-foreground">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center">
                                        <span className="w-3.5 h-3.5 mr-1">👥</span> Live betting
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-3.5 h-3.5 mr-1">📊</span> Real odds
                                    </div>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateMarketPage;
