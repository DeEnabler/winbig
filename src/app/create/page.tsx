'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
                                <RadioGroup value={betSide} onValueChange={(value) => setBetSide(value as 'yes' | 'no')} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="yes" />
                                        <Label htmlFor="yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="no" />
                                        <Label htmlFor="no">No</Label>
                                    </div>
                                </RadioGroup>
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
                        <Card>
                            <CardHeader>
                                <CardTitle>Market Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="w-full h-40 bg-gray-200 rounded-md flex items-center justify-center mb-4">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Market preview" className="object-cover w-full h-full rounded-md" />
                                    ) : (
                                        <ImageIcon className="h-12 w-12 text-gray-400" />
                                    )}
                                </div>
                                <h3 className="text-lg font-semibold">{marketQuestion || 'Your market question will appear here.'}</h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    Resolves on: {resolutionDate ? resolutionDate.toLocaleDateString() : 'select a date'}
                                </p>
                                <div className="flex justify-between items-center mt-4">
                                    <div className={cn("px-4 py-2 rounded-md", betSide === 'yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>
                                        Yes
                                    </div>
                                    <div className={cn("px-4 py-2 rounded-md", betSide === 'no' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800')}>
                                        No
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateMarketPage;
