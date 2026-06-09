import { useState, useEffect } from 'react';
import type { SupportedLanguage, ExecutionResult, Submission } from '../types/editor.types';
import { submissionService } from '../services/submission.service';

const STARTER_TEMPLATES: Record<SupportedLanguage, string> = {
  javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Create a Map to store indices of numbers
    const numMap = new Map();
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        // If complement is in map, return indices
        if (numMap.has(complement)) {
            return [numMap.get(complement), i];
        }
        
        numMap.set(nums[i], i);
    }
    
    return [];
};`,
  typescript: `function twoSum(nums: number[], target: number): number[] {
    const numMap = new Map<number, number>();
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        if (numMap.has(complement)) {
            return [numMap.get(complement)!, i];
        }
        
        numMap.set(nums[i], i);
    }
    
    return [];
}`,
  python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        num_map = {}
        
        for i, num in enumerate(nums):
            complement = target - num
            
            if complement in num_map:
                return [num_map[complement], i]
                
            num_map[num] = i
            
        return []`,
  java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> numMap = new HashMap<>();
        
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            
            if (numMap.containsKey(complement)) {
                return new int[] { numMap.get(complement), i };
            }
            
            numMap.put(nums[i], i);
        }
        
        return new int[] {};
    }
}`,
  cpp: `#include <vector>
#include <unordered_map>

class Solution {
public:
    std::vector<int> twoSum(std::vector<int>& nums, int target) {
        std::unordered_map<int, int> numMap;
        
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            
            if (numMap.find(complement) != numMap.end()) {
                return { numMap[complement], i };
            }
            
            numMap[nums[i]] = i;
        }
        
        return {};
    }
};`,
};

export function useCodeEditor(problemId: string) {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('javascript');
  const [codeMap, setCodeMap] = useState<Record<SupportedLanguage, string>>(STARTER_TEMPLATES);
  const [currentCode, setCurrentCode] = useState<string>(STARTER_TEMPLATES.javascript);
  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const [runResult, setRunResult] = useState<ExecutionResult | null>(null);
  const [submitResult, setSubmitResult] = useState<Submission | null>(null);
  
  const [activeConsoleTab, setActiveConsoleTab] = useState<'testcase' | 'result'>('testcase');

  // Synchronize current code when language changes
  useEffect(() => {
    setCurrentCode(codeMap[selectedLanguage]);
  }, [selectedLanguage, codeMap]);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
  };

  const handleCodeChange = (newCode: string) => {
    setCurrentCode(newCode);
    setCodeMap((prev) => ({
      ...prev,
      [selectedLanguage]: newCode,
    }));
  };

  const runCode = async () => {
    setIsRunning(true);
    setRunResult(null);
    setSubmitResult(null);
    setActiveConsoleTab('result');

    try {
      const result = await submissionService.runCode(problemId, selectedLanguage, currentCode);
      setRunResult(result);
    } catch (err) {
      setRunResult({
        status: 'Runtime Error',
        stderr: err instanceof Error ? err.message : 'An unknown error occurred.',
        runtime: 0,
        memory: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    setIsSubmitting(true);
    setRunResult(null);
    setSubmitResult(null);
    setActiveConsoleTab('result');

    try {
      const result = await submissionService.submitCode(problemId, selectedLanguage, currentCode);
      setSubmitResult(result);
    } catch (err) {
      setSubmitResult({
        id: Math.random().toString(36).substring(7),
        problemId,
        language: selectedLanguage,
        code: currentCode,
        status: 'Runtime Error',
        submittedAt: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCode = () => {
    setCodeMap((prev) => ({
      ...prev,
      [selectedLanguage]: STARTER_TEMPLATES[selectedLanguage],
    }));
    setCurrentCode(STARTER_TEMPLATES[selectedLanguage]);
  };

  const clearResults = () => {
    setRunResult(null);
    setSubmitResult(null);
    setActiveConsoleTab('testcase');
  };

  return {
    selectedLanguage,
    currentCode,
    isRunning,
    isSubmitting,
    runResult,
    submitResult,
    activeConsoleTab,
    handleLanguageChange,
    handleCodeChange,
    runCode,
    submitCode,
    resetCode,
    clearResults,
    setActiveConsoleTab,
  };
}
