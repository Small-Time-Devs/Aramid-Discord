import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';

/**
 * Format number with commas and fixed decimals
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places to show
 * @returns {string} Formatted number
 */
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    
    // Handle very small numbers with scientific notation
    if (num < 0.0001 && num > 0) {
        return num.toExponential(decimals);
    }
    
    // Format with commas and fixed decimals
    const fixedNum = parseFloat(num).toFixed(decimals);
    return parseFloat(fixedNum).toLocaleString('en-US');
}

/**
 * Format currency value
 * @param {number} value - Value to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    
    if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
        return `$${(value / 1e3).toFixed(2)}K`;
    } else {
        return `$${value.toFixed(2)}`;
    }
}

/**
 * Format percentage value with color indicator
 * @param {number} value - Percentage value
 * @returns {string} Formatted percentage string with emoji
 */
function formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) return '0.00%';
    
    const formattedValue = value.toFixed(2);
    if (value > 0) {
        return `+${formattedValue}% 🟢`;
    } else if (value < 0) {
        return `${formattedValue}% 🔴`;
    } else {
        return `${formattedValue}% ⚪`;
    }
}

/**
 * Display the token research results
 * @param {Object} interaction - Discord interaction
 * @param {string} tokenAddress - Token address
 * @param {Object} tokenInfo - Token information object
 */
export async function displayTokenResearch(interaction, tokenAddress, tokenInfo) {
    try {
        console.log('[RESEARCH DISPLAY] Creating research options display');
        
        const metadata = tokenInfo.metadata;
        const tokenSymbol = metadata.symbol || 'UNKNOWN';
        const tokenName = metadata.name || 'Unknown Token';
        
        // Create a simple embed to show options before displaying full research
        const optionsEmbed = new EmbedBuilder()
            .setTitle(`${tokenSymbol} (${tokenName}) - Research Options`)
            .setDescription(`Token ${tokenAddress.substring(0, 8)}...${tokenAddress.substring(tokenAddress.length - 4)} found! What would you like to know?`)
            .setColor(0x00AAFF);
        
        if (metadata.image) {
            optionsEmbed.setThumbnail(metadata.image);
        }
            
        // Add basic info to the embed
        optionsEmbed.addFields(
            {
                name: 'Basic Information',
                value: [
                    `• Symbol: ${tokenSymbol}`,
                    `• Name: ${tokenName}`,
                    `• Price: ${formatCurrency(tokenInfo.price || 0)}`,
                    `• 24h Change: ${formatPercentage(tokenInfo.priceChange['24h'] || 0)}`
                ].join('\n'),
                inline: false
            }
        );
            
        // Add selection buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`show_basic_info_${tokenAddress}`)
                    .setLabel('View Detailed Information')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId(`ask_aramid_ai_${tokenAddress}`)
                    .setLabel('Ask Aramid AI')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🤖'),
                new ButtonBuilder()
                    .setCustomId('back_to_research')
                    .setLabel('Research Another')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍')
            );
        
        // Send the options selection as a follow-up
        console.log('[RESEARCH DISPLAY] Sending research options');
        await interaction.followUp({
            embeds: [optionsEmbed],
            components: [row],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('[RESEARCH DISPLAY] Error displaying research options:', error);
        await interaction.followUp({
            content: `❌ Error displaying token information: ${error.message}`,
            ephemeral: true,
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_research')
                            .setLabel('Back to Research')
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        });
    }
}

/**
 * Display detailed token information
 * @param {Object} interaction - Discord interaction
 * @param {string} tokenAddress - Token address
 * @param {Object} tokenInfo - Token information object
 */
export async function displayDetailedTokenInfo(interaction, tokenAddress, tokenInfo) {
    try {
        const metadata = tokenInfo.metadata;
        const tokenSymbol = metadata.symbol || 'UNKNOWN';
        const tokenName = metadata.name || 'Unknown Token';
        
        // Create main embed
        const embed = new EmbedBuilder()
            .setTitle(`${tokenSymbol} (${tokenName})`)
            .setDescription(`Research results for ${tokenAddress.substring(0, 8)}...${tokenAddress.substring(tokenAddress.length - 4)}`)
            .setColor(0x00AAFF)
            .addFields(
                {
                    name: 'Price',
                    value: formatCurrency(tokenInfo.price),
                    inline: true
                },
                {
                    name: 'Market Cap',
                    value: formatCurrency(tokenInfo.marketCap),
                    inline: true
                },
                {
                    name: 'FDV',
                    value: formatCurrency(tokenInfo.fdv),
                    inline: true
                },
                {
                    name: '24h Volume',
                    value: formatCurrency(tokenInfo.volume['24h']),
                    inline: true
                },
                {
                    name: 'TVL',
                    value: formatCurrency(tokenInfo.liquidity.tvl),
                    inline: true
                },
                {
                    name: 'Holders',
                    value: formatNumber(tokenInfo.holders.count),
                    inline: true
                }
            );
        
        // Add price change section
        embed.addFields({
            name: 'Price Change',
            value: [
                `1h: ${formatPercentage(tokenInfo.priceChange['1h'])}`,
                `24h: ${formatPercentage(tokenInfo.priceChange['24h'])}`,
                `7d: ${formatPercentage(tokenInfo.priceChange['7d'])}`
            ].join(' | '),
            inline: false
        });
        
        // Add supply information
        embed.addFields({
            name: 'Supply Information',
            value: [
                `Total Supply: ${formatNumber(tokenInfo.supply.total)}`,
                `Circulating: ${formatNumber(tokenInfo.supply.circulating)}`
            ].join('\n'),
            inline: false
        });
        
        // Add token links
        embed.addFields({
            name: 'Links',
            value: [
                `[Solscan](https://solscan.io/token/${tokenAddress})`,
                `[Birdeye](https://birdeye.so/token/${tokenAddress})`,
                `[DexScreener](https://dexscreener.com/solana/${tokenAddress})`
            ].join(' | '),
            inline: false
        });
        
        // Set footer with last updated time
        embed.setFooter({
            text: `Last updated: ${new Date(tokenInfo.lastUpdated).toLocaleString()}`
        });
        
        // If we have an image URL, set it as the thumbnail
        if (metadata.image) {
            embed.setThumbnail(metadata.image);
        }
        
        // Add action buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ask_aramid_ai_${tokenAddress}`)
                    .setLabel('Ask Aramid AI')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🤖'),
                new ButtonBuilder()
                    .setCustomId('refresh_research')
                    .setLabel('Refresh Data')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('research_enter_address')
                    .setLabel('Research Another')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('back_to_research')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        
        // Send the research results
        await interaction.update({
            embeds: [embed],
            components: [row]
        });
        
    } catch (error) {
        console.error('Error displaying detailed token info:', error);
        await interaction.update({
            content: `❌ Error displaying token details: ${error.message}`,
            embeds: [],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_research')
                            .setLabel('Back to Research')
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        });
    }
}

/**
 * Format the full analysis into a more compact form
 * @param {string} fullText - The complete analysis response
 * @returns {string} - Formatted compact analysis
 */
function compactAnalysisFormat(fullText) {
    // Extract key metrics if they exist (usually at the beginning)
    const metricSection = extractMetricsSection(fullText);
    
    // Extract the core insights from each section
    const sections = extractSections(fullText);
    
    let compactAnalysis = '';
    
    // Add key metrics if found
    if (metricSection) {
        compactAnalysis += `${metricSection}\n\n`;
    }
    
    // Process each major section
    if (sections.marketOverview) {
        compactAnalysis += `**Market Summary**: ${summarizeSection(sections.marketOverview)}\n\n`;
    }
    
    if (sections.technicalAnalysis || sections.technicalAssessment) {
        const techSection = sections.technicalAnalysis || sections.technicalAssessment;
        compactAnalysis += `**Technical Analysis**: ${summarizeSection(techSection)}\n\n`;
    }
    
    if (sections.riskFactors) {
        compactAnalysis += `**Key Risks**: ${extractKeyPoints(sections.riskFactors)}\n\n`;
    }
    
    if (sections.conclusion || sections.overallConclusion) {
        const conclusionText = sections.conclusion || sections.overallConclusion;
        compactAnalysis += `**Conclusion**: ${summarizeSection(conclusionText)}`;
    }
    
    // If we couldn't parse the sections properly, return a compact version of the full text
    if (!compactAnalysis) {
        compactAnalysis = fullText.substring(0, 1500) + (fullText.length > 1500 ? '...' : '');
    }
    
    return compactAnalysis;
}

/**
 * Extract the metrics section with key token data
 * @param {string} text - Full analysis text
 * @returns {string|null} - Formatted metrics section or null if not found
 */
function extractMetricsSection(text) {
    // Look for patterns like "Market Overview" or token data at the beginning
    const metricsMatch = text.match(/\*\*Market Overview\*\*\s*\n\n\s*\*([^*]+)\*\s*([^*]+)|Token Name:.*\nSymbol:.*\nCurrent Price/);
    if (!metricsMatch) return null;
    
    // Look for bullet points with price, market cap, etc.
    const metricLines = text.split('\n').slice(0, 15).filter(line => 
        line.includes('Price') || 
        line.includes('Market Cap') || 
        line.includes('Volume') ||
        line.includes('Symbol') || 
        line.includes('Name')
    );
    
    if (metricLines.length === 0) return null;
    
    // Format into a compact representation
    return `**Key Metrics**:\n${metricLines.map(line => line.trim()).join('\n')}`;
}

/**
 * Extract bullet points or key statements from a section
 * @param {string} sectionText - Text of a section
 * @returns {string} - Extracted key points
 */
function extractKeyPoints(sectionText) {
    // Look for bullet points
    const bulletPoints = sectionText.split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('*'))
        .map(line => line.trim().replace(/^[•*]\s*/, ''));
    
    if (bulletPoints.length > 0) {
        // Take at most 4 bullet points
        return bulletPoints.slice(0, 4).join(', ') + 
            (bulletPoints.length > 4 ? ', etc.' : '');
    }
    
    // If no bullet points, just summarize
    return summarizeSection(sectionText);
}

/**
 * Summarize a section by taking first few sentences
 * @param {string} sectionText - Text of a section
 * @returns {string} - Summarized text
 */
function summarizeSection(sectionText) {
    // Get first few sentences, up to 250 characters
    const sentences = sectionText.split(/(?<=[.!?])\s+/);
    let summary = '';
    
    for (const sentence of sentences) {
        if (summary.length + sentence.length > 250) {
            if (summary.length === 0) {
                // If first sentence is too long, take part of it
                summary = sentence.substring(0, 250) + '...';
            } else {
                // Otherwise, stop adding sentences
                summary += '...';
            }
            break;
        }
        summary += (summary.length > 0 ? ' ' : '') + sentence;
    }
    
    return summary;
}

/**
 * Display AI analysis results
 * @param {Object} interaction - Discord interaction
 * @param {string} tokenAddress - Token address
 * @param {Object} aiResponse - AI analysis response
 * @param {Object} tokenInfo - Basic token information
 */
export async function displayAiAnalysis(interaction, tokenAddress, aiResponse, tokenInfo) {
    try {
        console.log('[AI ANALYSIS] Starting to display AI analysis');
        
        // More robust response validation and logging
        if (!aiResponse) {
            console.error('[AI ANALYSIS] No AI response received');
            throw new Error('AI analysis not available');
        }
        
        // Ensure we have an array to work with
        const analysisArray = Array.isArray(aiResponse) ? aiResponse : [aiResponse];
        console.log(`[AI ANALYSIS] Analysis array length: ${analysisArray.length}`);
        
        if (analysisArray.length === 0) {
            console.error('[AI ANALYSIS] Empty AI response array');
            throw new Error('AI analysis was empty');
        }
        
        const analysis = analysisArray[0]; // Get the first analysis
        console.log(`[AI ANALYSIS] First analysis: ${JSON.stringify(analysis).substring(0, 200)}...`);
        
        // More robust validation of the analysis object
        if (!analysis || typeof analysis !== 'object') {
            console.error('[AI ANALYSIS] Invalid analysis format:', analysis);
            throw new Error('AI analysis has invalid format');
        }
        
        // More robust property validation with detailed logging
        const name = analysis.name || 'TokenAnalyst';
        console.log(`[AI ANALYSIS] Analysis name: ${name}`);
        
        const personality = analysis.personality || 'AI Analysis Engine';
        console.log(`[AI ANALYSIS] Analysis personality: ${personality}`);
        
        const decision = analysis.decision || 'Analysis incomplete';
        console.log(`[AI ANALYSIS] Analysis decision: ${decision}`);
        
        const response = analysis.response || 'No detailed analysis available';
        console.log(`[AI ANALYSIS] Analysis response length: ${response.length}`);
        if (response.length > 0) {
            console.log(`[AI ANALYSIS] Analysis response preview: ${response.substring(0, 100)}...`);
        }
        
        // Validate tokenInfo with logging
        if (!tokenInfo || !tokenInfo.metadata) {
            console.log('[AI ANALYSIS] Using fallback token info');
        }
        
        const metadata = tokenInfo?.metadata || {
            name: 'Unknown Token',
            symbol: 'UNKNOWN'
        };
        
        const tokenSymbol = metadata.symbol || 'UNKNOWN';
        const tokenName = metadata.name || 'Unknown Token';
        
        // Use editReply if there's already a deferred/replied interaction
        if (interaction.deferred || interaction.replied) {
            console.log('[AI ANALYSIS] Using editReply for deferred interaction');
            
            // Determine color based on decision
            let decisionColor = 0x00AAFF; // Default blue
            if (decision.toLowerCase().includes('bullish') || 
                decision.toLowerCase().includes('positive')) {
                decisionColor = 0x00FF00; // Green for positive
            } else if (decision.toLowerCase().includes('cautious') || 
                      decision.toLowerCase().includes('neutral') ||
                      decision.toLowerCase().includes('mixed')) {
                decisionColor = 0xFFAA00; // Orange for neutral/cautious/mixed
            } else if (decision.toLowerCase().includes('bearish') || 
                      decision.toLowerCase().includes('risk') ||
                      decision.toLowerCase().includes('concerning')) {
                decisionColor = 0xFF0000; // Red for negative
            }
            
            // Extract key sections for a more compact display
            const sections = extractSections(response);
            
            // Create main embed with summary only
            const embed = new EmbedBuilder()
                .setTitle(`${tokenSymbol} (${tokenName}) - Analysis Summary`)
                .setDescription(`**Analyst**: ${name} - *${personality}*\n\n**Decision**: ${decision}`)
                .setColor(decisionColor);
            
            // If we have an image URL, set it as the thumbnail
            if (metadata.image) {
                embed.setThumbnail(metadata.image);
            }
            
            // Add key statistics if available
            if (sections.marketOverview) {
                const marketStats = extractKeyStats(sections.marketOverview);
                if (Object.keys(marketStats).length > 0) {
                    embed.addFields({
                        name: 'Key Metrics',
                        value: Object.entries(marketStats)
                            .map(([key, value]) => `• ${key}: ${value}`)
                            .join('\n'),
                        inline: false
                    });
                }
            }
            
            // Add the AI decision with reasoning
            const shortSummary = createShortSummary(sections, decision);
            if (shortSummary) {
                embed.addFields({
                    name: 'Summary',
                    value: shortSummary.length > 1024 ? shortSummary.substring(0, 1021) + '...' : shortSummary,
                    inline: false
                });
            }
            
            // Set footer
            embed.setFooter({
                text: `Token: ${tokenAddress.substring(0, 8)}...${tokenAddress.substring(tokenAddress.length - 4)}`
            });
            
            // Create buttons for different sections of analysis
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`show_market_${tokenAddress}`)
                        .setLabel('Market Overview')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId(`show_technical_${tokenAddress}`)
                        .setLabel('Technical Analysis')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📈'),
                    new ButtonBuilder()
                        .setCustomId(`show_risk_${tokenAddress}`)
                        .setLabel('Risk Factors')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⚠️')
                );
            
            // Row 2: Action buttons
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`show_basic_info_${tokenAddress}`)
                        .setLabel('Token Info')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId('refresh_research')
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('research_enter_address')
                        .setLabel('Research Another')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔍'),
                    new ButtonBuilder()
                        .setCustomId('back_to_research')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('↩️')
                );
            
            // Send the AI analysis using editReply
            await interaction.editReply({
                content: null, // Clear any previous content
                embeds: [embed],
                components: [row1, row2]
            });
            
            console.log('[AI ANALYSIS] Successfully sent AI analysis response');
            
        } else {
            // Fallback for non-deferred interactions (shouldn't happen, but just in case)
            console.log('[AI ANALYSIS] Using reply for non-deferred interaction');
            await interaction.reply({
                content: `Analysis summary for ${tokenSymbol}: ${decision}`,
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('Error displaying AI analysis:', error);
        
        try {
            // Use the proper reply method based on interaction state
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: `❌ Error displaying AI analysis: ${error.message}`,
                    embeds: [],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`show_basic_info_${tokenAddress}`)
                                    .setLabel('Show Basic Info Instead')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId('back_to_research')
                                    .setLabel('Back to Research')
                                    .setStyle(ButtonStyle.Secondary)
                            )
                    ]
                });
            } else {
                await interaction.reply({
                    content: `❌ Error displaying AI analysis: ${error.message}`,
                    ephemeral: true,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`show_basic_info_${tokenAddress}`)
                                    .setLabel('Show Basic Info Instead')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId('back_to_research')
                                    .setLabel('Back to Research')
                                    .setStyle(ButtonStyle.Secondary)
                            )
                    ]
                });
            }
        } catch (replyError) {
            console.error('Error sending error response:', replyError);
        }
    }
}

/**
 * Extract different sections from the full analysis
 * @param {string} response - Full AI analysis text
 * @returns {Object} - Object with different sections
 */
function extractSections(response) {
    const sections = {};
    
    // Attempt to split by markdown headings
    const sectionMatches = response.match(/\*\*(.*?)\*\*\n\n([\s\S]*?)(?=\n\n\*\*|$)/g);
    
    if (sectionMatches && sectionMatches.length > 0) {
        sectionMatches.forEach(section => {
            const titleMatch = section.match(/\*\*(.*?)\*\*/);
            if (titleMatch && titleMatch[1]) {
                const title = titleMatch[1].trim();
                // Remove the title and get the content
                const content = section.replace(/\*\*(.*?)\*\*\n\n/, '').trim();
                
                // Convert title to camelCase key
                const key = title.toLowerCase()
                    .replace(/market overview/i, 'marketOverview')
                    .replace(/technical analysis/i, 'technicalAnalysis')
                    .replace(/risk factors/i, 'riskFactors')
                    .replace(/overall.*conclusion/i, 'conclusion')
                    .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
                    .replace(/\s/g, '')
                    .replace(/^([A-Z])/, (_, char) => char.toLowerCase());
                
                sections[key] = content;
            }
        });
    }
    
    return sections;
}

/**
 * Extract key statistics from market overview
 * @param {string} marketOverview - Market overview text
 * @returns {Object} - Object with key statistics
 */
function extractKeyStats(marketOverview) {
    const stats = {};
    
    if (!marketOverview) return stats;
    
    // Extract price
    const priceMatch = marketOverview.match(/Current Price \(USD\):\s*([\d\.]+)/);
    if (priceMatch && priceMatch[1]) {
        stats['Price'] = `$${priceMatch[1]}`;
    }
    
    // Extract market cap
    const marketCapMatch = marketOverview.match(/Market Cap:\s*([\d\.]+)/);
    if (marketCapMatch && marketCapMatch[1]) {
        const marketCap = parseFloat(marketCapMatch[1]);
        if (marketCap >= 1000000) {
            stats['Market Cap'] = `$${(marketCap / 1000000).toFixed(2)}M`;
        } else {
            stats['Market Cap'] = `$${marketCap.toLocaleString()}`;
        }
    }
    
    // Extract 24h change if available
    const changeMatch = marketOverview.match(/24h Change:\s*([\+\-\d\.]+)%/);
    if (changeMatch && changeMatch[1]) {
        stats['24h Change'] = `${changeMatch[1]}%`;
    }
    
    return stats;
}

/**
 * Create a short summary from the analysis sections
 * @param {Object} sections - Analysis sections
 * @param {string} decision - Analysis decision
 * @returns {string} - Short summary
 */
function createShortSummary(sections, decision) {
    let summary = '';
    
    // Add a brief overview from the conclusion if available
    if (sections.conclusion) {
        // Get the first 3 sentences or first paragraph
        const sentences = sections.conclusion.split(/\.\s+/);
        const firstSentences = sentences.slice(0, 3).join('. ');
        summary += firstSentences;
        if (!summary.endsWith('.')) summary += '.';
    }
    
    // If we have risk factors, add a short mention
    if (sections.riskFactors) {
        const riskLines = sections.riskFactors.split('\n').filter(line => line.includes('•'));
        if (riskLines.length > 0) {
            summary += '\n\n**Key Risks**: ';
            summary += riskLines.slice(0, 2).map(line => line.trim().replace(/^•\s*/, '')).join(', ');
        }
    }
    
    // If summary is too short or doesn't exist, create one from the decision
    if (summary.length < 100) {
        summary = `Based on analysis, this token appears to be a ${decision.toLowerCase()} investment at this time.`;
        summary += ' Click the Market Overview or Technical Analysis buttons for more details.';
    }
    
    return summary;
}

// Add this new function to handle section view requests
export async function displayAnalysisSection(interaction, tokenAddress, sectionType) {
    try {
        // Always use deferUpdate first to acknowledge the interaction
        // Wrap in try/catch to handle already-acknowledged interactions
        try {
            await interaction.deferUpdate();
        } catch (deferError) {
            console.error('[AI SECTION] Error deferring update:', deferError.message);
            // If already deferred, continue execution
        }
        
        const userId = interaction.user.id;
        
        // Get the state from the main module
        const { state } = await import('../coinResearchMain.mjs');
        
        // Check if we have analysis data for this token
        if (!state.activeResearch[userId] || 
            !state.activeResearch[userId].aiResponse) {
            console.error('[AI SECTION] No AI analysis data found for', tokenAddress);
            await interaction.followUp({
                content: `❌ Analysis data not found. Please try analyzing the token again.`,
                ephemeral: true
            });
            return;
        }
        
        // Get the analysis data
        const analysisArray = state.activeResearch[userId].aiResponse;
        if (!Array.isArray(analysisArray) || analysisArray.length === 0) {
            console.error('[AI SECTION] Invalid AI analysis data format');
            await interaction.followUp({
                content: `❌ Invalid analysis data format. Please try analyzing the token again.`,
                ephemeral: true
            });
            return;
        }
        
        const analysis = analysisArray[0];
        const response = analysis.response || '';
        const sections = extractSections(response);
        
        // Determine which section to display
        let sectionTitle = '';
        let sectionContent = '';
        let color = 0x0099FF;
        
        switch (sectionType) {
            case 'market':
                sectionTitle = 'Market Overview';
                sectionContent = sections.marketOverview || 'No market data available';
                color = 0x00AAFF;
                break;
            case 'technical':
                sectionTitle = 'Technical Analysis';
                sectionContent = sections.technicalAnalysis || 'No technical analysis available';
                color = 0x00FF00;
                break;
            case 'risk':
                sectionTitle = 'Risk Factors';
                sectionContent = sections.riskFactors || 'No risk analysis available';
                color = 0xFF9900;
                break;
            default:
                sectionTitle = 'Analysis Details';
                sectionContent = 'Please select a section to view';
        }
        
        // Build the embed
        const embed = new EmbedBuilder()
            .setTitle(sectionTitle)
            .setDescription(sectionContent.length > 4000 ? sectionContent.substring(0, 4000) + '...' : sectionContent)
            .setColor(color)
            .setFooter({
                text: `Analysis by ${analysis.name} | Token: ${tokenAddress.substring(0, 6)}...`
            });
        
        // Create buttons to switch between sections
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`show_market_${tokenAddress}`)
                    .setLabel('Market Overview')
                    .setStyle(sectionType === 'market' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId(`show_technical_${tokenAddress}`)
                    .setLabel('Technical Analysis')
                    .setStyle(sectionType === 'technical' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId(`show_risk_${tokenAddress}`)
                    .setLabel('Risk Factors')
                    .setStyle(sectionType === 'risk' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setEmoji('⚠️'),
                new ButtonBuilder()
                    .setCustomId(`ask_aramid_ai_${tokenAddress}`)
                    .setLabel('Back to Summary')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️')
            );
        
        // For already replied interactions, we need to use editReply
        try {
            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            console.log(`[AI SECTION] Successfully showed ${sectionType} section for ${tokenAddress}`);
        } catch (editError) {
            console.error(`[AI SECTION] Error editing reply: ${editError.message}`);
            
            // If we can't edit the reply, try to send a follow-up
            await interaction.followUp({
                content: `Here's the ${sectionTitle} for this token:`,
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('Error displaying analysis section:', error);
        // Try to send a followUp if possible
        try {
            await interaction.followUp({
                content: `❌ Error displaying section: ${error.message}`,
                ephemeral: true
            });
        } catch (followUpError) {
            console.error('Error sending follow-up message:', followUpError);
        }
    }
}
