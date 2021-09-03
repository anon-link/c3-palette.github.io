library(ggplot2)
#library(ggfortify)
library(cluster)
#library(lfda)
#library(coin)
library(pwr)
#library(shiny)
#library(miniUI)
library(boot)
library(tidyr)
#library(irr)
library(lazyeval)
#library(doBy)
library(gtable)
library(grid)
library(scales)
library(plyr)
library(dplyr)
library(bootES)
#library(extrafont)
library(rpart)
#library(rpart.plot)
#library(NMF)
library(stringr)
#library(lsa)
#library(tidytext)
# Clustering: http://www.sthda.com/english/articles/29-cluster-validation-essentials/97-cluster-validation-statistics-must-know-methods/#silhouette-coefficient
#library(factoextra)
#library(fpc)
#library(NbClust)
# interactive heatmaps
#library(heatmaply)
#library(dendextend)
#library(WaveletComp)


#loadfonts()

# Reporting
report <- function(data, attr) {
  cat("N=",   round( length( data[[attr]] ), 2), ",", 
      "M=",   round( mean( data[[attr]] )  , 2), ",", 
      "sd=",  round( sd( data[[attr]] )    , 2), ",", 
      "Mdn=", round( median( data[[attr]] ), 2), ",", 
      "mad=", round( mad( data[[attr]] )   , 2), 
  sep="")
}

reportCI <- function(data, attr) {
  # bootstrapping with 1000 replications
  ci <- boot.ci(
    boot(data=data[[attr]], statistic=mean.fun, R=1000, sim="ordinary")
  )
  
  # complete report
  # cat( "mu = ",     round( mean( data[[attr]] ), 2), " 95% CI ~ ", 
  #      "[", round( ci$bca[,4]          , 2), ", ", 
  #      round( ci$bca[,5]          , 2), "]", 
  #      sep="")
  # basic report e.g., 2~[1, 3]
  result <- paste(format(round( mean( data[[attr]] ), 2), nsmall = 2), 
                  "~[", format(round( ci$bca[,4], 2), nsmall = 2), 
                  ", ", 
                  format(round( ci$bca[,5], 2), nsmall = 2), "]", sep="")
  return(result)
}

reportES <- function(data, attr, group) {
  
  # lvs <- levels(data[[group]])
  lvs <- unique(as.character(data[[group]]))
  if(lvs[1] != "Palettailor") {
    lvs <- replace(lvs, c(1, 2), lvs[c(2, 1)])
  }

  b <- bootES(data, 
              data.col=attr, 
              group.col=group, 
              contrast=lvs, # normal cases c(group1=1, group2=-1), but for 2 groups, it's simplified.
              effect.type="cohens.d")
  
  # complete report
  # cat( "d=", round( b$t0, 2), "~", 
  #      "[", round( b$bounds[1], 2), ",", 
  #      round( b$bounds[2], 2), "]", 
  #      sep="")
  result <- paste( round( b$t0, 2), "~", 
              "[", round( b$bounds[1], 2), ",", 
              round( b$bounds[2], 2), "]", 
              sep="")
  return(result)
}

reportES_one_sample <- function(data, attr) {
  
  b <- bootES( unlist(data[attr]), R=1000,
          effect.type="cohens.d")
  
  result <- paste( round( b$t0, 2), "~", 
                   "[", round( b$bounds[1], 2), ",", 
                   round( b$bounds[2], 2), "]", 
                   sep="")
  return(result)
}



reportES_within <- function(data, attr, group="search_state") {
  
  # lvs <- levels(data[[group]])
  # print(lvs[1])
  
  
}

# Generate the result table for error in the discrimination tasks.
stat_table <- function(data,our_condition) {
  columns <- c("Condition", "μ~95%CI", "W", "p-value", "d")
  conditions <- levels(data$conditionName) %>% rev
  df_stats <- matrix("", ncol = length(columns), nrow = length(conditions)) %>% 
    data.frame() %>% 
    mutate_if(is.factor, as.character)
  names(df_stats) <- columns
  df_stats$Condition <- conditions

  
  for (index in 1:length(conditions)) {
    current_condition <- conditions[index]
    sub_data_one_group <- data %>% filter(conditionName==current_condition)
    # 95%CI
    df_stats[index, "μ~95%CI"] <- reportCI(sub_data_one_group, "error")
    
    if(current_condition != our_condition) {
      sub_data_two_groups <- data %>% filter(conditionName==our_condition | conditionName==current_condition)
      # W test
      wt <- wilcox.test(error ~ conditionName, 
                        data = sub_data_two_groups, 
                        conf.int=TRUE)
      df_stats[index, "W"] <- as.character(wt$statistic)
      df_stats[index, "p-value"] <- format(wt$p.value, format = "e", digits = 2)
      
      # alternative report: with breaks.
      # if(wt$p.value < 0.05) { df_stats[index, "p-value"] <- "< 0.05"}
      # if(wt$p.value < 0.01) { df_stats[index, "p-value"] <- "< 0.01"}
      # if(wt$p.value < 0.001) { df_stats[index, "p-value"] <- "< 0.001"}
      # else { df_stats[index, "p-value"] <- "≥ 0.05" }
      
      # Effect size
      df_stats[index, "d"] <- reportES(sub_data_two_groups, "error", "condition")
    }
  }
  
  return(df_stats)
}


# Generate the result table for error in the discrimination tasks.
stat_table_time <- function(data) {
  columns <- c("Condition", "μ~95%CI", "W", "p-value", "d")
  conditions <- levels(data$condition) %>% rev
  df_stats <- matrix("", ncol = length(columns), nrow = length(conditions)) %>% 
    data.frame() %>% 
    mutate_if(is.factor, as.character)
  names(df_stats) <- columns
  df_stats$Condition <- conditions
  
  for (index in 1:length(conditions)) {
    current_condition <- conditions[index]
    sub_data_one_group <- data %>% filter(condition==current_condition)
    # 95%CI
    df_stats[index, "μ~95%CI"] <- reportCI(sub_data_one_group, "totalTime")
    
    if(current_condition != "Ours Generation") {
      sub_data_two_groups <- data %>% filter(condition=="Ours Generation" | condition==current_condition)
      # W test
      wt <- wilcox.test(totalTime ~ condition, 
                        data = sub_data_two_groups, 
                        conf.int=TRUE)
      df_stats[index, "W"] <- as.character(wt$statistic)
      df_stats[index, "p-value"] <- format(wt$p.value, format = "e", digits = 2)
      
      # alternative report: with breaks.
      # if(wt$p.value < 0.05) { df_stats[index, "p-value"] <- "< 0.05"}
      # if(wt$p.value < 0.01) { df_stats[index, "p-value"] <- "< 0.01"}
      # if(wt$p.value < 0.001) { df_stats[index, "p-value"] <- "< 0.001"}
      # else { df_stats[index, "p-value"] <- "≥ 0.05" }
      
      # Effect size
      df_stats[index, "d"] <- reportES(sub_data_two_groups, "totalTime", "condition")
    }
  }
  
  return(df_stats)
}

# Generate the result table for the preference tasks.
stat_table_preference <- function(data) {
  columns <- c("Condition", "μ~95%CI", "V", "p-value", "d")
  conditions <- levels(data$condition) %>% rev
  df_stats <- matrix("", ncol = length(columns), nrow = length(conditions)) %>% 
    data.frame() %>% 
    mutate_if(is.factor, as.character)
  names(df_stats) <- columns
  df_stats$Condition <- conditions
  
  for (index in 1:length(conditions)) {
    current_condition <- conditions[index]
    sub_data_one_group <- data %>% filter(condition==current_condition)
    # 95%CI
    df_stats[index, "μ~95%CI"] <- reportCI(sub_data_one_group, "preference")
    # W test
    # Reference used for calculation: http://www.sthda.com/english/wiki/one-sample-wilcoxon-signed-rank-test-in-r
    # The alternative hypothesis here is sample mean != 0
    wt <- wilcox.test(sub_data_one_group$preference, alternative = "two.sided", conf.int=TRUE)
    
    df_stats[index, "V"] <- as.character(wt$statistic)
    df_stats[index, "p-value"] <- format(wt$p.value, format = "e", digits = 2)
    #   
    #   # alternative report: with breaks.
    #   # if(wt$p.value < 0.05) { df_stats[index, "p-value"] <- "< 0.05"}
    #   # if(wt$p.value < 0.01) { df_stats[index, "p-value"] <- "< 0.01"}
    #   # if(wt$p.value < 0.001) { df_stats[index, "p-value"] <- "< 0.001"}
    #   # else { df_stats[index, "p-value"] <- "≥ 0.05" }
    
    # Effect size
    df_stats[index, "d"] <- reportES_one_sample(sub_data_one_group, 'preference')
  }
  
  return(df_stats)
}

# Filtering

madfilter <- function(data, attr, fac) {
  mad <- mad( data[[attr]] )
  median <- median( data[[attr]] )
  data <-
    data[ data[[attr]] < median + fac*mad &
            data[[attr]] > median - fac*mad, ]
}

rangefilter <- function(data, attr, lo, hi) {
  data <-
    data[ data[[attr]] < hi &
            data[[attr]] > lo, ]
}

# Bootstrap 95% CI for mean
# function to obtain mean from the data (with indexing)
mean.fun <- function(D, d) {
  return( mean(D[d]) )
}

mean.var.fun <- function(D, d) {
  c(mean(D[d]), var(mean(D[d])))
}

########################## count bar ##########################
countBar <- function(data,x,group, xRange=NULL){
  data['x_'] <- data[x]
  data['group_'] <- data[group]
  
  p <- ggplot(data, aes(x_, fill = group_))
  p <- p + geom_histogram(binwidth=1, alpha=1, position="dodge",stat="count")
  p <- p + coord_cartesian(xlim = xRange) 
  p <- p + labs(y="Count",
                x=x,
                fill=group,
                title=paste("Proportional Distribution: ",x," ~ ",group))
  print(p)
}

countBarMulti <- function(data,xCol, group, xRange=NULL){
  for(x in xCol){
    countBar(data,x,group, xRange)
  }  
}

########################## scatter plot ##########################
scatterPlot <- function(data,y,x,alpha=0.3){
  data['y_'] <- data[y]
  data['x_'] <- data[x]
  
  p <- ggplot(data, aes(y_, x=x_, color = x_))
  p <- p + geom_point(shape=1, alpha=alpha)
  p <- p + labs(y=y,
                x=x,
                color=x,
                title=paste("Scatter Plot: ",y," ~ ",x))
  print(p)
}

scatterPlotMulti <- function(data,yCol, x, alpha=0.3){
  for(y in yCol){
    scatterPlot(data,y,x, alpha)
  }  
}

########################## density ##########################
densityPlot <- function(data,x,group,xRange=NULL){
  data['x_'] <- data[x]
  data['group_'] <- data[group]
  
  p <- ggplot(data, aes(x_, fill = group_))
  p <- p + geom_density( alpha=0.5 )
  p <- p + coord_cartesian(xlim=xRange)
  p <- p + labs(y="Density",
                x=x,
                fill=group,
                title=paste("Density: ",x," ~ ",group))
  print(p)
}

densityPlotMulti <- function(data,xCol, group=NULL){
  for(x in xCol){
    densityPlot(data,x,group)
  }  
}

########################## proportional bar chart ##########################
proportionalBar <- function(data,x, group){
  charX <- x
  charGroup <- group
  data['x_'] <- data[charX]
  data['group_'] <- data[charGroup]
  
  data.new<-ddply(data,.(group_),plyr::summarise,
                  proportion=as.numeric(prop.table(table(x_))),
                  category=names(table(x_)))
  
  p <- ggplot(data.new,aes(x=category,y=proportion,fill=group_))
  p <- p + geom_bar(stat="identity",position='dodge')
  p <- p + geom_text(aes(label = sprintf("%1.2f%%", 100*proportion)),position = position_dodge(0.9),vjust=-0.25)
  p <- p + labs(y="Proportion",
                x=charX,
                fill=charGroup,
                title=paste("Proportional Distribution: ",charX," ~ ",charGroup))
  print(p)
}

proportionalBarMulti <- function(data,xCol, group){
  for(x in xCol){
    proportionalBar(data,x,group)
  }
}

########################## proportional test ##########################
proportionalTest <- function(data, x, compareValue, group){
  data['compareVar_'] <- ifelse(data[x] == compareValue ,0,1)
  data['group_'] <- data[group]
  
  tbl <- table(data$group_,data$compareVar_)
  print(tbl)
  test <- prop.test(tbl,correct=TRUE)
  print(test)
  lower <- test$conf.int[1]
  upper <- test$conf.int[2]
  print(paste("Diff=",test$estimate[1]-test$estimate[2]))
}

########################## proportional test CI bar ##########################
proportionalTestCIBar <- function(data, x, compareValue, group, xRange=0, yRange=0){
  
  data['compareVar_'] <- ifelse(data[x] == compareValue ,1,0)
  data['group_'] <- data[group]
  
  df<-ddply(data,.(group_),plyr::summarise,
                prop=sum(compareVar_)/length(compareVar_),
                low=prop.test(sum(compareVar_),length(compareVar_))$conf.int[1],
                upper=prop.test(sum(compareVar_),length(compareVar_))$conf.int[2])
  
  #basic
  p <- ggplot(df,aes(group_,y=prop,ymin=low,ymax=upper,fill=group_))
  p <- p + geom_bar(stat="identity",width=.5)
  p <- p +  geom_errorbar(width = 0.1)
  p <- p + geom_text(aes(label = sprintf("%1.2f%%", 100*prop)),position = position_dodge(0.9),vjust=-0.25)
  p <- p + labs(y="Proportion",
                x=x,
                fill=group,
                title=paste("Proportions of ",compareValue," in ",x,"with CI: ", " ~ ",group))
  p
}

proportionalTestCIFancy <- function(data, x, compareValue, group, xRange=0, yRange=0,savePath="test.pdf"){
  
  data['compareVar_'] <- ifelse(data[x] == compareValue ,1,0)
  data['group_'] <- data[group]
  
  df<-ddply(data,.(group_),plyr::summarise,
            prop=sum(compareVar_)/length(compareVar_),
            lower=prop.test(sum(compareVar_),length(compareVar_))$conf.int[1],
            upper=prop.test(sum(compareVar_),length(compareVar_))$conf.int[2])
  
  p <- ggplot(df, aes(group_, y=prop,ymin=low,ymax=upper, colour = group_))
  p <- p + scale_color_manual(values=c("#998EC3","#fa9fb5"))
  p <- p + theme(axis.title=element_text(size=20), axis.text=element_text(size=18))
  p <- p + geom_pointrange(aes(ymin = lower, ymax = upper)) 
  p <- p + expand_limits(y = yRange) 
  p <- p + ylab("Percentage") 
  p <- p + xlab("") 
  p <- p + geom_errorbar(aes(ymin = lower, ymax = upper), width = 0.1) 
  p <- p + coord_flip() 
  p <- p + theme_bw() 
  p <- p + theme(plot.title=element_text(hjust=0))
  p <- p + theme(panel.border=element_blank())
  p <- p + theme(panel.grid.minor=element_blank())
  p <- p + theme(axis.ticks=element_blank())
  p <- p + theme(legend.key=element_rect(color="white"))
  #p <- p + theme(text=element_text(family="Garamond"))
  p <- p + theme(axis.text.y = element_blank())
  p <- p + scale_y_continuous(labels=percent)
  p <- p + guides(colour=FALSE)
  p
  
  ggsave(savePath, p, width=2.75, height=0.75)
}

########################## CI plot ##########################
ciplot <- function(data, y, x, title, yRange=0, xRange=0, ifPreference = FALSE) {

  data['x_'] <- data[x]
  data['y_'] <- data[y]
  
  data[['x_']] <- factor(data[['x_']])
  
  groups <- group_by_(data, 'x_')
  
  # So far the only way to enable string as param
  groupedData <- dplyr::summarize(groups, 
                                  mean=mean(y_),
                                  UCI= boot.ci(boot(y_, statistic = mean.fun, R=5000, sim="ordinary"))$bca[,5],
                                  LCI= boot.ci(boot(y_, statistic = mean.fun, R=5000, sim="ordinary"))$bca[,4])

  
  df <- data.frame(
    trt = factor(groupedData[[1]]),
    resp = groupedData[["mean"]],
    group = factor(groupedData[[1]]),
    upper = c(groupedData[["UCI"]]),
    lower = c(groupedData[["LCI"]])
  )
  
  # Plot
  # p <- ggplot(df, aes(trt, resp, color = "#2b8cbe"))
  # p <- p + scale_color_manual(values="#2b8cbe")
  p <- ggplot(df, aes(trt, resp, color = trt))
  p <- p + scale_color_manual(values=c("#3274a1","#e1812c","#3274a1","#e1812c","#e1812c","#e1812c"))
  #p <- p + scale_color_manual(values=c("#3274a1","#3274a1","#3274a1","#e1812c","#e1812c","#e1812c"))
  p <- p + theme(axis.title=element_text(size=20), axis.text=element_text(size=15))
  p <- p + geom_pointrange(aes(ymin = lower, ymax = upper), size = 2) 
  
  if(ifPreference == TRUE) {
    print('expand_limits')
    p <- p + expand_limits(y = c(-0.6, 0.6))
    p <- p + geom_hline(yintercept = 0, linetype="dashed")
  }
  
  # p <- p + expand_limits(y = yRange)
  # p <- p + xlim(-1, 1)
  # p <- p + scale_y_continuous(breaks = seq(yRange[1],yRange[2], length.out = 5))
  p <- p + ylab(y) 
  p <- p + xlab("") 
  p <- p+ggtitle(title)
  p <- p + geom_errorbar(aes(ymin = lower, ymax = upper), width = 0.1) 
  p <- p + coord_flip() 
  p <- p + theme_bw() 
  p <- p + theme(plot.title=element_text(hjust=0))
  # p <- p + theme(panel.border=element_blank())
  p <- p + theme(panel.grid.minor=element_blank())
  p <- p + theme(axis.ticks=element_blank())
  # p <- p + theme(axis.text.y = element_blank())
  p <- p + theme(legend.key=element_rect(color="white"))
  p <- p + guides(colour=FALSE)
  p <- p + theme(text = element_text(size=25))
  p
  
}

ciplotFancy <- function(data, y, x, yRange=0, xRange=0,
                        colors=c("#998EC3","#F1A340"),
                        savePath="", exportDimension = c(2.75, 0.75)) {
  
  data['x_'] <- data[x]
  data['y_'] <- data[y]
  
  data[['x_']] <- factor(data[['x_']])
  
  groups <- group_by_(data, 'x_')
  
  # So far the only way to enable string as param
  groupedData <- dplyr::summarize(groups, 
                                  mean=mean(y_),
                                  UCI= boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,5],
                                  LCI= boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,4])
  
  
  df <- data.frame(
    trt = factor(groupedData[[1]]),
    resp = groupedData[["mean"]],
    group = factor(groupedData[[1]]),
    upper = c(groupedData[["UCI"]]),
    lower = c(groupedData[["LCI"]])
  )
  
  #ci bar colors
  colors = c("#998EC3","#F1A340")
  
  p <- ggplot(df, aes(trt, resp, colour = group))
  p <- p + scale_color_manual(values=colors)
  p <- p + geom_pointrange(aes(ymin = lower, ymax = upper), size = 0.3)
  # shape = 1 http://www.sthda.com/english/wiki/ggplot2-point-shapes
  
  if(length(yRange) == 2 ) {
    p <- p + expand_limits(y = yRange) 
    p <- p + scale_y_continuous(breaks = seq(yRange[1],yRange[2], length.out = 5))
  }
  p <- p + ylab(y) 
  p <- p + xlab("") 
  p <- p + geom_errorbar(aes(ymin = lower, ymax = upper), width = 0.05) 
  p <- p + coord_flip() 
  p <- p + theme_bw() 
  # p <- p + theme(plot.title=element_text(hjust=0))
  p <- p + theme(plot.title=element_blank())
  p <- p + theme(panel.border=element_blank())
  p <- p + theme(panel.grid.minor=element_blank())
  p <- p + theme(axis.ticks=element_blank())
  #p <- p + theme(legend.key=element_rect(color="white"))
  # p <- p + theme(text=element_text(family="Avenir Next"))
  p <- p + theme(axis.title=element_text(size=10), 
                 axis.text.x=element_text(size=7, margin = margin(t = -2), color = "gray"))
  p <- p + guides(colour=FALSE)
  print(p)
  
  if(savePath != ""){
    p <- p + theme(axis.text.y = element_blank())
    ggsave(savePath, p, width=exportDimension[1], height=exportDimension[2], useDingbats=FALSE)
  }
}

ciplotMulti <- function(data, yCol, x, yRange=0, xRange=0) {
  for(y in yCol){
    ciplot(data,y,x,yRange,xRange)
  }
}

ciplotManual <- function(data, y, x, title, yRange=0, xRange=0) {
  
  data['x_'] <- data[x]
  data['y_'] <- data[y]
  
  #data[['x_']] <- factor(data[['x_']])
  
  groups <- group_by(data, x_)
  
  # So far the only way to enable string as param
  groupedData <- dplyr::summarize(groups, 
                                  mean=mean(y_)
                                  #UCI=boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,5],
                                  #LCI=boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,4]
                                  )
  
  
  # df <- data.frame(
  #   trt = factor(groupedData[[1]]),
  #   resp = groupedData[["mean"]],
  #   group = factor(groupedData[[1]]),
  #   upper = c(groupedData[["UCI"]]),
  #   lower = c(groupedData[["LCI"]])
  # )
  
  # Fixed CI calculation?
  df2 <- groups %>%
    #group_by(data[[x_]]) %>%
    dplyr::summarize(n=n(),resp=mean(y_),sd=sd(y_)) %>%
    mutate(se=sd/sqrt(n),lower=resp+qnorm(0.025)*se,upper=resp+qnorm(0.975)*se)
  df2['trt'] <- factor(groupedData[[1]])

  # Plot
  p <- ggplot(df2, aes(trt, resp,color=trt))
  #p <- p + scale_color_manual(values=c("#998EC3","#F1A340"))
  p <- p + theme(axis.title=element_text(size=20), axis.text=element_text(size=18))
  p <- p + geom_pointrange(aes(ymin = lower, ymax = upper)) 
  p <- p + expand_limits(y = yRange, x = xRange) 
  p <- p + geom_errorbar(aes(ymin = lower, ymax = upper), width = 0.1) 
  p <- p + labs(y=y,
                x=x,
                title=paste("CI Plot: ",y, " ~ ", x, " of ",title))
  #p <- p + geom_hline(yintercept = 0)
  p <- p + coord_flip() 
  print(p)
}
## Gives count, mean, standard deviation, standard error of the mean, and confidence interval (default 95%).
##   data: a data frame.
##   measurevar: the name of a column that contains the variable to be summariezed
##   groupvars: a vector containing names of columns that contain grouping variables
##   na.rm: a boolean that indicates whether to ignore NA's
##   conf.interval: the percent range of the confidence interval (default is 95%)
summarySE <- function(data=NULL, measurevar, groupvars=NULL, na.rm=FALSE,
                      conf.interval=.95, .drop=TRUE) {
  library(plyr)
  
  # New version of length which can handle NA's: if na.rm==T, don't count them
  length2 <- function (x, na.rm=FALSE) {
    if (na.rm) sum(!is.na(x))
    else       length(x)
  }
  
  # This does the summary. For each group's data frame, return a vector with
  # N, mean, and sd
  datac <- ddply(data, groupvars, .drop=.drop,
                 .fun = function(xx, col) {
                   c(N    = length2(xx[[col]], na.rm=na.rm),
                     mean = mean   (xx[[col]], na.rm=na.rm),
                     sd   = sd     (xx[[col]], na.rm=na.rm)
                   )
                 },
                 measurevar
  )
  
  # Rename the "mean" column    
  datac <- rename(datac, c("mean" = measurevar))
  
  datac$se <- datac$sd / sqrt(datac$N)  # Calculate standard error of the mean
  
  # Confidence interval multiplier for standard error
  # Calculate t-statistic for confidence interval: 
  # e.g., if conf.interval is .95, use .975 (above/below), and use df=N-1
  ciMult <- qt(conf.interval/2 + .5, datac$N-1)
  datac$ci <- datac$se * ciMult
  
  return(datac)
}

#with error
ciBar <- function(data, measure, group){
  data <- summarySE(data, measurevar=measure, groupvars=group,
                    na.rm=FALSE, conf.interval=.95)
  xAxis = as.symbol(group)
  yAxis = as.symbol(measure)
  print(xAxis)
  print(yAxis)
  ggplot(data, aes(x=xAxis, y=yAxis)) + 
    geom_bar(position=position_dodge(), stat="identity") +
    geom_errorbar(aes(ymin=error_log-ci, ymax=error_log+ci),
                  width=.2,                    # Width of the error bars
                  position=position_dodge(.9))
}

# Generate full report including: means, ci plot, and effect size
fullReport <- function(data, y, group, vis, project="project", 
                       yRange=0, paired=FALSE, 
                       saveFolder = "",
                       saveFile = "default", exportDimention=c(2.75, 0.75)) {
  
  data['group_'] <- data[group]
  data['y_'] <- data[y]
  
  # two levels
  # lv <- c('hololens', 'control')
  lv <- levels(data$group_)
  print(lv)
  
  report(data %>% filter(group_==lv[1]), y)
  reportCI(data %>% filter(group_==lv[1]),y)
  report(data %>% filter(group_==lv[2]),y)
  reportCI(data %>% filter(group_==lv[2]),y)
  
  tt <- t.test(y_ ~ group_, data)
  print(tt)
  wt <- wilcox.test(y_ ~ group_, data, conf.int=TRUE,paired=paired)
  print(wt)
  
  reportES(data, y, group) 
  
  savePath = paste(saveFolder,"/",sep="")
  if(saveFile == "default") {
    savePath = paste(savePath, project, "-", vis, "-", y,".pdf",sep="")
  } else {
    savePath = paste(savePath, saveFile, ".pdf", sep = "")
  }
  
  # fancy ci plots
  print(exportDimention)
  ciplotFancy(data, y,x=group,yRange=yRange,
              savePath=savePath,
              exportDimension = exportDimention)

}


powerAnalysisGraph <- function(m1, m2, stdev, iterNum=15){
  # stdev <- sd_duration.median
  # m1 <- mean(search$duration.median)
  # m2 <- mean(nonsearch$duration.median)
  # # m1 <- mean(foresight$duration.median)
  # # m2 <- mean(nonsearch$duration.median)
  
  iteration <- 15
  
  difference <- 0
  effectSize <- 0
  numParticipants <- 0
  
  for(step in 1:iteration)
  {
    difference[step] <- abs(m1 - m2) * (0.9 ^ (step-1))
    effectSize[step] <- difference[step] / stdev
    numParticipants[step] <- pwr.t.test( 
      d=effectSize[step], 
      sig.level=.05, 
      power=0.8, 
      type="two.sample" 
    )$n * 1.15
  }
  
  #dual axis code online: https://rpubs.com/kohske/dual_axis_in_ggplot2
  grid.newpage()
  
  pw <- data.frame(difference=difference, numParticipants=numParticipants, effectSize=effectSize)
  p1 <- ggplot(pw,aes(x=difference)) + geom_line(aes(y = numParticipants)) +
    scale_y_continuous(breaks = pretty(pw$numParticipants, n = 10))
  p2<- ggplot(pw,aes(x=difference)) + geom_line(aes(y = effectSize)) +
    theme(panel.background = element_rect(fill = NA))+
    scale_y_continuous(breaks = pretty(pw$effectSize, n = 10))
  p2
  
  # extract gtable
  g1 <- ggplot_gtable(ggplot_build(p1))
  g2 <- ggplot_gtable(ggplot_build(p2))
  
  # overlap the panel of 2nd plot on that of 1st plot
  pp <- c(subset(g1$layout, name == "panel", se = t:r))
  g <- gtable_add_grob(g1, g2$grobs[[which(g2$layout$name == "panel")]], pp$t, pp$l, pp$b, pp$l)
  
  # axis tweaks
  ia <- which(g2$layout$name == "axis-l")
  ga <- g2$grobs[[ia]]
  ax <- ga$children[[2]]
  ax$widths <- rev(ax$widths)
  ax$grobs <- rev(ax$grobs)
  ax$grobs[[1]]$x <- ax$grobs[[1]]$x - unit(1, "npc") + unit(0.15, "cm")
  g <- gtable_add_cols(g, g2$widths[g2$layout[ia, ]$l], length(g$widths) - 1)
  g <- gtable_add_grob(g, ax, pp$t, length(g$widths) - 1, pp$b)
  
  # draw it
  grid.draw(g)
}

# Compute optimal k
wssPlot <- function(data, range = c(1:15), fun = kmeans) {
  wss <- (nrow(data)-1)*sum(apply(data,2,var))
  for (i in range) wss[i] <- sum(fun(data,
                                     centers=i)$withinss)
  plot(range, wss, type="b", xlab="Number of Clusters",
       ylab="Within groups sum of squares",
       main="Assessing the Optimal Number of Clusters with the Elbow Method",
       pch=20, cex=2)  
}

# kmeans index plot
kmIndexPlot <- function(data, maxCluster = 15, index = "within.cluster.ss") {
  indices <- c()
  for (i in c(2:maxCluster)) {
    aa <- eclust(data, "kmeans", k = i, nstart = 25, graph = FALSE)
    indices[i] <- as.numeric(cluster.stats(dist(data),  aa$cluster)[index])
  }
  plot(c(1:maxCluster), as.numeric(indices), type="b", xlab="Number of Clusters",
       ylab=index,
       main=paste("Assessing #Clusters (kmeans)", index),
       pch=20, cex=2)  
}

# hierarchical clustering index plot
hcIndexPlot <- function(data, isdiss = FALSE, maxCluster = 15, index = "within.cluster.ss", method = "ward.D2") {
  indices <- c()
  methods <- c("ward.D", "ward.D2", "single", "complete", "average")
  
  for (i in c(2:maxCluster)) {
    cls <- hcut(data, isdiss = isdiss, k = i, graph = FALSE, hc_method = method)
    if(isdiss == FALSE) {
      indices[i] <- as.numeric(cluster.stats(dist(data),  cls$cluster)[index])
    } else {
      indices[i] <- as.numeric(cluster.stats(data, cls$cluster)[index])
    }
  }
  
  plot(c(1:maxCluster), as.numeric(indices), type="b", xlab="Number of Clusters",
       ylab=index,
       main=paste("Assessing #Clusters (hcut)", index, "using method", method) ,
       pch=20, cex=2)  
}

# Helper function to add a generated matrix to data_participants
add_visit_matrix <- function(data_aggregated_visits, data_participants, spread_key_str) {
  data_aggregated_visits['spread_key__'] <- data_aggregated_visits[spread_key_str]
  output <- data_aggregated_visits %>%
    select(code, id, spread_key__) %>%
    spread(code, spread_key__, fill=0, sep="_") %>%
    # Rename the columns
    rename_(.dots=setNames(names(.), gsub("code_", spread_key_str, names(.)))) %>%
    # Merge with per_participant
    right_join(data_participants, by="id") %>%
    mutate_at(vars(starts_with(spread_key_str)), funs(replace(., is.na(.), 0)))
  return (output)
}

# Helper function to add a generated tfidf matrix to data_participants
# and add uniqueSum metrics
add_visit_tfidf_matrix_and_uniqueSum <- function(data_aggregated_visits, data_participants, spread_key_str) {
  data_aggregated_visits['spread_key__'] <- data_aggregated_visits[spread_key_str]
  
  # tfidf_visit_binary matrix ####
  data_tfidf <- data_aggregated_visits %>%
    bind_tf_idf(code, id, spread_key__)
  
  # aggregate: uniqueSum
  data_participants <- data_tfidf %>%
    mutate(tfidf_exp=exp(tf_idf)-1) %>%
    group_by(id) %>%
    summarise(uniqueSum=sum(tf_idf), 
              uniqueSum_transformed=sum(tfidf_exp)
              #uniqueDistance = sqrt(sum(tf_idf^2)) 
              ) %>%
    data.frame() %>%
    right_join(data_participants, by="id")
  #  mutate_at(vars(uniqueSum, uniqueSum_transformed), funs(replace(., is.na(.), 0)))
  
  names(data_participants)[names(data_participants) == 'uniqueSum'] <- paste('uniqueSum', spread_key_str, sep = '_')
  names(data_participants)[names(data_participants) == 'uniqueSum_transformed'] <- paste('uniqueSum', spread_key_str, 'transformed', sep = '_')
  #names(data_participants)[names(data_participants) == 'uniqueDistance'] <- paste('uniqueDistance', spread_key_str, sep = '_')
  
  
  # form matrix and merge
  data_participants <- data_tfidf %>%
    select(id, code, tf_idf) %>%
    spread(code, tf_idf, fill=0, sep="_") %>%
    rename_(.dots=setNames(names(.), gsub("code_", paste("tfidf", spread_key_str, sep='_'), names(.)))) %>%
    right_join(data_participants, by="id") %>%
    mutate_at(vars(starts_with(paste("tfidf", spread_key_str, sep='_'))), funs(replace(., is.na(.), 0)))
  
  return (data_participants)
}

########################## box plot ##########################
boxplot <- function(data, y, x) {
  data['x_'] <- data[x]
  data['y_'] <- data[y]
  ggplot(data, aes(x_, y_, color = "#2b8cbe")) +  #, color=data$paletteName)
    scale_color_manual(values="#2b8cbe") + 
    geom_boxplot() + 
    theme(axis.title=element_text(size=20), axis.text=element_text(size=15))+ 
    ylab(y)+  
    xlab("") + 
    coord_flip() + 
    theme_bw() + 
    theme(plot.title=element_text(hjust=0))+ 
    theme(panel.grid.minor=element_blank())+ 
    theme(axis.ticks=element_blank())+ 
    theme(legend.key=element_rect(color="white"))+ 
    guides(colour=FALSE)+ 
    theme(text = element_text(size=25))
  
}

